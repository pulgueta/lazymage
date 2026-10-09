# Contributing to `lazymage`

Thank you for considering contributing to lazymage! We appreciate your support and welcome any contributions you can make to enhance the package.

The following guidelines will help you understand how to contribute effectively:

## Ways to Contribute

There are several ways you can contribute to the project:

1. Report Issues
2. Suggest Enhancements
3. Answer Open Issues
4. Submit Pull Requests

## Reporting Issues

If you encounter any issues or bugs while using react-lazy-load-image-component, please help us improve by reporting them. To report an issue, follow these steps:

1. Check if the issue has already been reported by searching the [GitHub Issues](https://github.com/pulgueta/lazymage/issues) of the repository.
2. If the issue hasn't been reported, click on the "New Issue" button.
3. Provide a clear and descriptive title for the issue.
4. Describe the steps to reproduce the issue, including any relevant code snippets or error messages.
5. Explain the expected behavior and the actual behavior you observed.
6. Add any additional information, such as screenshots or environment details, that may be helpful.
7. Finally, submit the issue and await further instructions or clarifications.

## Suggesting Enhancements

We welcome suggestions for enhancing react-lazy-load-image-component. If you have an idea for a new feature, or you believe an existing feature can be improved, please follow these steps:

1. Check the [GitHub Issues](https://github.com/pulgueta/lazymage/issues) of the repository to see if a similar suggestion has already been made.
2. If your suggestion hasn't been proposed yet, click on the "New Issue" button.
3. Provide a clear and descriptive title for the enhancement.
4. Describe the current limitations or problems you're experiencing that your suggested enhancement aims to address.
5. Clearly explain how your suggested enhancement would improve the package.
6. Include any relevant code examples, if applicable.
7. Submit the enhancement suggestion and await further discussion or feedback.

## Answering Open Issues

You can contribute to `lazymage` by helping to answer open issues in the GitHub repository. This includes:

- Helping users solve their problems or find workarounds.
- Replicating reported bugs and providing additional information or insights.
- Sharing your knowledge and expertise to assist other users.

To contribute in this way, follow these steps:

1. Visit the [GitHub Issues](https://github.com/pulgueta/lazymage/issues) page of the repository.
2. Look for open issues that you can provide assistance with.
3. Read through the issue description and any existing comments to understand the problem or question.
4. If you can reproduce the issue, follow the steps provided and document your findings in a comment.
5. Offer suggestions, workarounds, or explanations to help resolve the issue.
6. Engage in respectful and constructive conversations with the issue reporter and other contributors.

## Submitting Pull Requests

### Set up the project

You need [Bun](https://bun.sh) and Node.js 24 or newer.

```bash
bun install
```

### Commands

| Command | What it does |
| --- | --- |
| `bun run check` | Lint (Oxlint) and check the format (Oxfmt) through Ultracite. |
| `bun run fix` | Apply the safe lint and format fixes. |
| `bun run typecheck` | Check the types with TypeScript. |
| `bun run test` | Run the tests with Vitest. |
| `bun run build` | Build the package into `dist/`. |
| `bun run lint:package` | Check the package with publint and Are the Types Wrong. Run `build` first. |
| `bun run docs:dev` | Start the docs site with Blume. |
| `bun run docs:build` | Build the docs site into `docs/dist/`. |

Run `check`, `typecheck`, and `test` before you open a pull request.

### Add a changelog

lazymage uses [Tegami](https://tegami.fuma-nama.dev) for versions and releases. If your change affects users, add a changelog file.

1. Run `bun run tegami`.
2. Select the bump type: `patch`, `minor`, or `major`.
3. Write a short description for users.
4. Commit the new file in `.tegami/` with your change.

You can also write the file by hand. Name it `.tegami/YYYY-MM-DD-<hash>.md`:

```md
---
packages:
  lazymage: patch
---

## Fix the blur effect in Safari

The blur effect now ends when the image loads.
```

Do not edit `CHANGELOG.md` or `.tegami/publish-lock.yaml`.

### Releases

When a pull request with a changelog merges into `master`, Tegami opens a version pull request. When the version pull request merges, Tegami publishes the package to npm and creates a GitHub release.
