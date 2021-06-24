#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate proposed JSON files and output a meaningful error message to be posted as a
comment in the related PR.
"""
import argparse
import errno
import json
import sys
from json import JSONDecodeError
from pathlib import Path

from jsonschema import Draft7Validator, draft7_format_checker

# this is so dumb, but I don't have to import os.
basepath = Path(__file__).resolve().parts[:-3]
JSONFILE = Path(*basepath, "template.json")

_WARN_BADFORMAT = """#### Property {prop!r} is erronous!

* error: {message}.
* A description of the property: {desc}
"""

_WARN_REQUIRED = """#### Required property not found.

{rmessage}.

Please make sure the following properties are present in your json: `{required}`
"""

_WARN_ENUM_NONMEMBER = """#### Property {prop!r} is invalid.

Property {prop!r} contains a value which wasn't found in the predefined set.

{item!r} (index:{prop_idx}), is not one of `{family}`.
"""

_WARN_OPT_EMPTY = """#### Property {prop!r} is empty.

An optional property ({prop!r}) has been found to be empty, and it is therefore
useless to include it in your file. You should consider removing it.
"""

_ERROR_MSG = """
### {path} — {etype}

{message}
"""
_ERROR_TPL = """
### {path}

{message}
"""
output_msgs = {}


def mput(idx, msg, **kwargs):
    output_msgs.setdefault(idx, [])
    output_msgs[idx].append(msg.format(**kwargs))
    return output_msgs[idx][-1]


def graceful_load(pfile, msgs):
    try:
        file = open(pfile)
    except (IOError, OSError) as e:
        if e.errno != errno.ENOENT:
            raise
        diagnostics.append(
            _ERROR_MSG.format(
                path=pfile,
                etype="FileNotFound",
                message=(
                    "Sentinel couldn't find the file `{!r}`. This is a bug and means "
                    "the CI is broken."
                ).format(pfile),
            )
        )
        return None
    with file:
        try:
            return json.load(file)
        except JSONDecodeError as e:
            msgs.append(
                _ERROR_MSG.format(
                    path=pfile,
                    etype="JSONDecodeError",
                    message=f"The JSON couldn't be parsed:\n`{e}`",
                )
            )
            return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Check given json for the existence of required keys."
    )
    parser.add_argument("file", nargs="+", metavar="FILE")
    args = parser.parse_args()

    # Exit early if we either have no file or none of them are json.
    if not args.file or not any(f.endswith(".json") for f in args.file):
        sys.exit()

    diagnostics = []
    error_msgs = []
    schema = graceful_load(JSONFILE, error_msgs)
    # TODO: fail gracefully if Draft7Validator raise an exception
    validator = Draft7Validator(schema, format_checker=draft7_format_checker)
    for jfile in args.file:
        if not jfile.endswith(".json"):
            continue
        instance = graceful_load(jfile, error_msgs)
        if not instance:
            continue
        for error in validator.iter_errors(instance):
            if error.validator == "contains" and not error.instance:
                mput(jfile, _WARN_OPT_EMPTY, prop=error.path.popleft())
            elif error.validator == "enum":
                mput(
                    jfile,
                    _WARN_ENUM_NONMEMBER,
                    prop_idx=error.path.pop(),
                    prop=error.path.pop(),
                    item=error.instance,
                    family=error.validator_value,
                )
            elif error.validator == "required":
                mput(
                    jfile,
                    _WARN_REQUIRED,
                    rmessage=error.message,
                    required=error.validator_value
                )
            elif error.validator == "format" and error.validator_value in (
                "date",
                "uri",
                "iri",
            ):
                mput(
                    jfile,
                    _WARN_BADFORMAT,
                    message=error.message,
                    prop=error.path.popleft(),
                    desc=error.schema["description"]
                )
            else:
                mput(jfile, error.message)

    if output_msgs:
        errors = []
        for f, msgs in output_msgs.items():
            errors.append(_ERROR_TPL.format(path=f, message="\n".join(msgs)))
        if errors:
            print("\n- - -\n".join(errors))
    if error_msgs:
        print("\n- - -\n".join(error_msgs))
    if diagnostics:
        print(">>>", file=sys.stderr)
        print("\n".join(diagnostics), file=sys.stderr)
        sys.exit(1)
