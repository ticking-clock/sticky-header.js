sticky-header.js
================
A jQuery plugin for keeping section headers stuck in view as you scroll through a page. If you configure multiple sticky headers in your DOM hierarchy, they will stack with one another appropriately.

Todo
----
There is quite a lot to do.

- Revisit how left- and right- margins are set up. Configuring the plugin with functions shouldn't be a necessary step for base use cases.
- Create a demo page that highlights the "stacky" aspect of the sticky headers.
- Consider refactoring the internal classes to use prototype inheritance, but do not introduce other dependencies beyond jQuery core.
- Create a test fixture DOM and add qUnit tests.
