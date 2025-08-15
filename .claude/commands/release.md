# Release Management

## Create a Release

To trigger the release process via CLI:

```bash
# Auto-detect version bump based on conventional commits
gh workflow run release-please.yml

# Force a specific version bump type
gh workflow run release-please.yml -f release-type=patch  # Patch release (0.0.x)
gh workflow run release-please.yml -f release-type=minor  # Minor release (0.x.0)
gh workflow run release-please.yml -f release-type=major  # Major release (x.0.0)
```

## Check Release PR Status

After triggering the workflow, check for the Release PR:

```bash
# List open PRs from release-please
gh pr list --label "autorelease: pending"

# View the Release PR details
gh pr view <PR_NUMBER>
```

## Complete the Release

Once the Release PR is created:

```bash
# Review the changelog and version bump
gh pr view <PR_NUMBER>

# Merge the Release PR to create the release
gh pr merge <PR_NUMBER> --merge

# View the created release
gh release view --web
```

## Full Release Process Example

```bash
# 1. Trigger release workflow
gh workflow run release-please.yml

# 2. Wait for workflow to complete and create PR
gh run list --workflow=release-please.yml

# 3. Review and merge the Release PR
gh pr list --label "autorelease: pending"
gh pr merge <PR_NUMBER> --merge

# 4. Verify the release
gh release list --limit 1
```

## Notes

- Release-please creates a PR first, not a direct release
- The PR includes changelog updates and version bumps
- Merging the PR triggers the actual GitHub release creation
- Version is determined by conventional commit types unless overridden
