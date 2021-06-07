#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate proposed JSON files and output a meaningful error message to be posted as a
comment in the related PR.
"""
import argparse
import errno
import json
import textwrap
from json import JSONDecodeError
from pathlib import Path

from jsonschema import Draft7Validator

# this is so dumb, but I don't have to import os.
basepath = Path(__file__).resolve().parts[:-3]
JSONFILE = Path(*basepath, "template.json")

_WARN_REQUIRED = (
    "{}. Please verify your file and make sure the following properties are populated:"
    " `{}`"
)
_WARN_ENUM_NONMEMBER = (
    "Property {prop!r} contains a value which wasn't found in the predefined set.<br> "
    "{item!r} (index:{idx}), is not one of `{family}`."
)
_WARN_OPT_EMPTY = (
    "An optional property ({prop!r}) has been found to be empty, and it is therefore "
    "useless to include it in your file. You need to remove it."
)
_ERROR_MSG = """
### {path} — {etype}

{message}
"""


def graceful_load(jfile):
    try:
        file = open(jfile)
    except (IOError, OSError) as e:
        if e.errno != errno.ENOENT:
            raise
        diagnostics.append(
            _ERROR_MSG.format(
                path=jfile,
                etype="FileNotFound",
                message=(
                    "Sentinel couldn't find the file `{!r}`. This is a bug and means "
                    "the CI is broken."
                ).format(jfile),
            )
        )
        raise  # FIXME: The message might be redundant
    with file:
        try:
            return json.load(file)
        except JSONDecodeError as e:
            diagnostics.append(
                _ERROR_MSG.format(path=file, etype="JSONDecodeError", message=e.msg)
            )
            return None


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Check given json for the existence of required keys."
    )
    parser.add_argument("file", nargs="+", metavar="FILE")
    args = parser.parse_args()

    # Exit early if we either have no file or none of them are json.
    if not args.file or not any(f.endswith('.json') for f in args.file):
        exit

    diagnostics = []
    schema = graceful_load(JSONFILE)
    # TODO: fail gracefully if Draft7Validator raise an exception
    validator = Draft7Validator(schema)
    error_msgs = []
    for jfile in args.file:
        if not jfile.endswith(".json"):
            continue
        # TODO: check for proper path to jfile
        # TODO: trim excess parents from jfile if necessary
        instance = graceful_load(jfile)
        if not instance:
            error_msgs.extends(diagnostics)
            diagnostics = []
            continue
        for error in validator.iter_errors(instance):
            if error.validator == "contains" and not error.instance:
                message = _WARN_OPT_EMPTY.format(prop=error.path.pop())
            elif error.validator == "enum":
                message = _WARN_ENUM_NONMEMBER.format(
                    idx=error.path.pop(),
                    prop=error.path.pop(),
                    item=error.instance,
                    family=error.validator_value,
                )
            elif error.validator == "required":
                message = _WARN_REQUIRED.format(error.message, error.validator_value)
            else:
                message = error.message

            error_msgs.append(
                _ERROR_MSG.format(
                    path=jfile,
                    etype=error.__class__.__name__,
                    message=textwrap.fill(message),
                )
            )

    if error_msgs:  # Exit with an error to fail the CI.
        print("\n- - -\n".join(error_msgs))
        exit(1)
