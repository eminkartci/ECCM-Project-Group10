# Git Quick Guide: add - commit - push

This guide briefly explains the 3 basic steps to send your changes to the remote repository.

## 1) `git add` - Prepare changes (staging)

`git add` selects which files will be included in the commit.

Most common usage:

```bash
git add .
```

- Stages all changes (new + modified files) in the current directory.

```bash
git add file_name.py
```

- Stages only a specific file.

To check:

```bash
git status
```

## 2) `git commit` - Create a meaningful snapshot

`git commit` stores staged changes as a labeled snapshot.

```bash
git commit -m "Short and clear message"
```

Example:

```bash
git commit -m "Added Windows steps to installation guide"
```

Good commit message tips:

- Briefly describe what you changed
- If possible, explain why you changed it
- Try to keep one logical change per commit

## 3) `git push` - Send to remote repository

`git push` sends your commits to a remote repository such as GitHub/GitLab.

```bash
git push
```

If you are pushing a new branch for the first time:

```bash
git push -u origin <branch-name>
```

Example:

```bash
git push -u origin feature/installation-docs
```

## Shortest full flow

```bash
git status
git add .
git commit -m "Message describing the changes"
git push
```

## Common mistakes

- `nothing to commit`: you may have forgotten `git add`, or there are no file changes.
- `non-fast-forward` / push rejected: pull remote changes first (`git pull`), then push again.
- Wrong branch: check your current branch with `git branch`.

