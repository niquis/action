## Introduction

The `niquis` action collects metrics of your project and uploads them to a cloud database.
It then uses these stored metrics as a baseline when comparing the same set of metrics
extracted from pull requests with the main branch.

The sort of questions this action is trying to answer is:

 - Does this pull request increase the bundle size of my NPM package?
 - Does this pull request increase the sizes of certain [Next.js] pages?
 - Does this pull request add an excessive number of new dependencies?

Basically anything that can be measured quantitatively, is fair game to feed into Niquis.

## Reports

The niquis action adds a comment to the pull request with a summary of the differences.
In a tabular form, you'll see which measurements have increased or decreased when compared
with the baseline (main or master branch).

## Setup

Two steps are required:

**Step 1**: Create a config file. If the file is not present, the
action remain inactive. In the file you specify what metrics should be collected:

Filename: .github/niquis.yml

```
version: v0
collect:
  - type: next.js
  - type: npm
```

**Step 2**: Create a workflow file where you run your build command(s), and then the niquis
action (or at whichever point you are ready to collect the metrics) .

Filename: .github/workflows/build.yml

```
name: Build
on:
  push:
    branches: master
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - uses: actions/setup-node@master
      - run: npm install
      - run: npm run build
      - uses: niquis/action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NIQUIS_TOKEN: ${{ secrets.NIQUIS_TOKEN }}
```

Note: During the alpha phase the niquis action will require a token to access the
cloud API. Send an email to tomc@caurea.org if you're interested in the project
and you will receive the token.

## Future

Because all the data is stored in a cloud database, Niquis will eventually offer a web
interface where users can inspect the measurements over a longer period of time (using
charts and other interactive visualizations).

[Next.js]: https://nextjs.org/
