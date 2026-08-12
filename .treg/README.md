# treg configuration

This project is connected to the `the-gram-s` treg team. The checked-in
configuration deliberately points at a local token file instead of containing a
team credential.

To configure a new checkout, create `.treg/token` and paste the team token into
it as a single line. The token file is ignored by Git. Do not commit it, copy it
into logs, or expose it to application code.

The treg service documentation is available at
<https://treg.superdesign.dev/llms.txt>.
