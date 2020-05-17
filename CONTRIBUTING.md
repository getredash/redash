# Contributing Guide

Thank you for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing to Redash. These are guidelines, not rules, please use your best judgement and feel free to propose changes to this document in a pull request.

## Quick Links:

- [Feature Requests](https://discuss.redash.io/c/feature-requests)
- [Documentation](https://redash.io/help/)
- [Blog](https://blog.redash.io/)
- [Twitter](https://twitter.com/getredash)

---
:star: If you already here and love the project, please make sure to press the Star button. :star:

---


## Table of Contents

[How can I contribute?](#how-can-i-contribute)

- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements / Feature Requests](#suggesting-enhancements--feature-requests)
- [Pull Requests](#pull-requests)
- [Documentation](#documentation)
- Design?

[Additional Notes](#additional-notes)

- [Release Method](#release-method)
- [Code of Conduct](#code-of-conduct)

## How can I contribute?

### Reporting Bugs

When creating a new bug report, please make sure to:

- Search for existing issues first. If you find a previous report of your issue, please update the existing issue with additional information instead of creating a new one.
- If you are not sure if your issue is really a bug or just some configuration/setup problem, please start a discussion in [the support forum](https://discuss.redash.io/c/support) first. Unless you can provide clear steps to reproduce, it's probably better to start with a thread in the forum and later to open an issue.
- If you still decide to open an issue, please review the template and guidelines and include as much details as possible.

### Suggesting Enhancements / Feature Requests

If you would like to suggest an enhancement or ask for a new feature:

- Please check [the forum](https://discuss.redash.io/c/feature-requests/5) for existing threads about what you want to suggest/ask. If there is, feel free to upvote it to signal interest or add your comments.
- If there is no open thread, you're welcome to start one to have a discussion about what you want to suggest. Try to provide as much details and context as possible and include information about *the problem you want to solve* rather only *your proposed solution*.

### Pull Requests

- **Code contributions are welcomed**. For big changes or significant features, it's usually better to reach out first and discuss what you want to implement and how (we recommend reading: [Pull Request First](https://medium.com/practical-blend/pull-request-first-f6bb667a9b6#.ozlqxvj36)). This to make sure that what you want to implement is aligned with our goals for the project and that no one else is already working on it.
- Include screenshots and animated GIFs in your pull request whenever possible.
- Please add [documentation](#documentation) for new features or changes in functionality along with the code.
- Please follow existing code style:
  - Python: we use [Black](https://github.com/psf/black) to auto format the code.
  - Javascript: we use [Prettier](https://github.com/prettier/prettier) to auto-format the code.
  
### Documentation

The project's documentation can be found at [https://redash.io/help/](https://redash.io/help/). The [documentation sources](https://github.com/getredash/website/tree/master/src/pages/kb) are hosted on GitHub. To contribute edits / new pages, you can use GitHub's interface. Click the "Edit on GitHub" link on the documentation page to quickly open the edit interface.

## Additional Notes

### Release Method

We publish a stable release every ~3-4 months, although the goal is to get to a stable release every month. 

Every build of the master branch updates the *redash/redash:preview* Docker Image. These releases are usually stable, but might contain regressions and therefore recommended for "advanced users" only.

When we release a new stable release, we also update the *latest* Docker image tag, the EC2 AMIs and GCE images.

## Code of Conduct

This project adheres to the Contributor Covenant [code of conduct](https://redash.io/community/code_of_conduct). By participating, you are expected to uphold this code. Please report unacceptable behavior to team@redash.io.
