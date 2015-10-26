# Relevance Editor

QNA tool with autocompletion feature

## Web editor version

#### Prerequisites

Install nodejs: [https://nodejs.org](https://nodejs.org)

Install node libs:

    > cd ace
    > npm install --production

#### Start server
    > cd ace
    > node static.js

The editor will be served at [http://localhost:8888/kitchen-sink.html](http://localhost:8888/kitchen-sink.html)

Change the Document option in the left pane to Relevance if it hasn't been set.

The web version uses Ace editor http://ace.c9.io. The full ace editor with Relevance mode is under 'ace' folder.

## Cmd version

#### Prerequisites

Install nodejs: [https://nodejs.org](https://nodejs.org)

Install node libs:

    > npm install --production

Command line version requires QNA/FixletDebugger to evaluate relevance. For MacOS, BES Client is required to be installed on the same machine. For Windows, QNA is already included in this package. 

#### Start the client
    > bin/qna