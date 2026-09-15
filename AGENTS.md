# Kairos contributor instructions

- Keep credentials, personal notes, deployment hosts and generated artifacts out of Git.
- Preserve the standalone release history. Do not merge private legacy history.
- Store application data in local IndexedDB; do not add an account or remote data service.
- Run npm run build, npm run test:security, relevant browser tests and npm run check:release.
- Test only with synthetic local data.
- Preserve Apache-2.0 and third-party copyright notices.
