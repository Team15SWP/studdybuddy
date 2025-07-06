# CD: Continuous Deployment

**Deployment Platform:** your server (SSH via Docker Compose)

**Trigger:**
- Automatic deployment on push to the `main` branch.
- Deployment on merged Pull Request to `main`.

**Deployment Success Checks:**
- CI steps before deployment (`build-and-test`) must complete successfully (linter, tests).
- SSH deployment script finishes without errors.
- Docker containers are running in `healthy` or `running` state.
