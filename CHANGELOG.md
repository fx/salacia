# Changelog

## [1.2.0](https://github.com/fx/salacia/compare/v1.1.0...v1.2.0) (2025-08-21)


### Features

* **ai:** add Ollama provider support with model discovery ([#143](https://github.com/fx/salacia/issues/143)) ([94b439a](https://github.com/fx/salacia/commit/94b439aaa648734cc04a06814edcf72ed4d281d4))
* **ci:** add manual trigger support to docker tag workflow ([15e5711](https://github.com/fx/salacia/commit/15e57113f6a2efb74f8c961179ab03dd46ca0476))
* **ui:** add enhanced message content preview with stop reason indicators ([#140](https://github.com/fx/salacia/issues/140)) ([2cd3a30](https://github.com/fx/salacia/commit/2cd3a30af4b0fca7b57c9ef2500d948a1115b73f))
* **ui:** add git shortref hover to version badge ([#141](https://github.com/fx/salacia/issues/141)) ([f0888a0](https://github.com/fx/salacia/commit/f0888a001d3ad0fbf758a3857e1b3a42138b6170))


### Bug Fixes

* **ci:** move tests to CI workflow and add proper database env ([158dafd](https://github.com/fx/salacia/commit/158dafdec298830dfef6fcd3fb56352883b8cf1c))

## [1.1.0](https://github.com/fx/salacia/compare/v1.0.3...v1.1.0) (2025-08-16)


### Features

* **messages:** add message data inspector dialog ([#135](https://github.com/fx/salacia/issues/135)) ([0c98e6a](https://github.com/fx/salacia/commit/0c98e6a64fb32be56708dac54a50984810a40893))
* **MessagesTable:** optimize table display for better density ([#133](https://github.com/fx/salacia/issues/133)) ([626cc40](https://github.com/fx/salacia/commit/626cc400a651b362e682cfaef8c3d460d359727f))


### Bug Fixes

* **ci:** add issues:write permission for release-please labels ([#132](https://github.com/fx/salacia/issues/132)) ([da9876b](https://github.com/fx/salacia/commit/da9876bf22478c6dcbd8156985647c4fec57220b))
* **navigation:** display dynamic version from package.json ([#136](https://github.com/fx/salacia/issues/136)) ([603f863](https://github.com/fx/salacia/commit/603f863ee0f009e7846886f9a9c3e5ced21c7d4c))
* **sse:** resolve streaming UI updates and provider tracking ([#127](https://github.com/fx/salacia/issues/127)) ([58f2b73](https://github.com/fx/salacia/commit/58f2b73196b56424ce0261efa122e6df4a10f68b))

## [1.0.3](https://github.com/fx/salacia/compare/v1.0.2...v1.0.3) (2025-08-16)


### Bug Fixes

* **tokens:** calculate total_tokens as prompt + completion sum ([#124](https://github.com/fx/salacia/issues/124)) ([2dc9998](https://github.com/fx/salacia/commit/2dc9998706202c8f27ea8e4bd1ae2805faaab9fc))

## [1.0.2](https://github.com/fx/salacia/compare/v1.0.1...v1.0.2) (2025-08-15)


### Bug Fixes

* **sse:** prevent heartbeat crashes on closed streams ([#122](https://github.com/fx/salacia/issues/122)) ([9704554](https://github.com/fx/salacia/commit/9704554079c2b0eac957ad6a7bdbd9506070218f))

## [1.0.1](https://github.com/fx/salacia/compare/v1.0.0...v1.0.1) (2025-08-15)


### Bug Fixes

* **docker:** include migrations in production image ([#119](https://github.com/fx/salacia/issues/119)) ([210475e](https://github.com/fx/salacia/commit/210475e3e37a4240f085d45c32b20d5e3e83d5d7))

## 1.0.0 (2025-08-15)


### Features

* add Dockerfile for production deployment ([#105](https://github.com/fx/salacia/issues/105)) ([982a992](https://github.com/fx/salacia/commit/982a992c733d5ba33d34a856d9b967ec341a183e))
* add initial devcontainer configuration ([1449ca2](https://github.com/fx/salacia/commit/1449ca26a4bbb9faa6cfa9ccb942ff48c5c5573d))
* **ai:** add provider configuration and types ([#10](https://github.com/fx/salacia/issues/10)) ([b958958](https://github.com/fx/salacia/commit/b958958d7eaa5dcce32f12d10e03d09f64dc699b))
* **ai:** add provider management layer ([#13](https://github.com/fx/salacia/issues/13)) ([8feabc6](https://github.com/fx/salacia/commit/8feabc68c534233e3681d577256d0091bb9843f2))
* **ai:** integrate AI service with real completions ([#14](https://github.com/fx/salacia/issues/14)) ([96e8746](https://github.com/fx/salacia/commit/96e874645692c6c32e465820984b5a537aa203f4))
* **api:** add Anthropic-compatible API endpoint with validation ([#11](https://github.com/fx/salacia/issues/11)) ([4eeb1e2](https://github.com/fx/salacia/commit/4eeb1e2660acec5dbc172ab46304a7bce1f580c8))
* **api:** add messages API endpoints for web interface ([#34](https://github.com/fx/salacia/issues/34)) ([fffcfc5](https://github.com/fx/salacia/commit/fffcfc5caf87584c79d9f910d77267e61fdab0a2))
* **api:** implement cursor-based pagination for messages ([#78](https://github.com/fx/salacia/issues/78)) ([b944437](https://github.com/fx/salacia/commit/b94443733ad80fd2801171b91d739fcb50d277f9))
* **ci:** add release-please for automated versioning ([#115](https://github.com/fx/salacia/issues/115)) ([efb4cb5](https://github.com/fx/salacia/commit/efb4cb51295840019c0daef677d9076dd4e45cb3))
* **docker:** add multi-platform Docker build workflow ([#107](https://github.com/fx/salacia/issues/107)) ([4463323](https://github.com/fx/salacia/commit/44633238e752e823d2f6ea6ee0e427db9529ec17))
* **frontend:** add simple web frontend layout with WebTUI ([#52](https://github.com/fx/salacia/issues/52)) ([6ff3d01](https://github.com/fx/salacia/commit/6ff3d013200af678e64a0d93cd41751a6b82cecf))
* **frontend:** integrate cursor pagination in messages UI ([#79](https://github.com/fx/salacia/issues/79)) ([3748c5f](https://github.com/fx/salacia/commit/3748c5fb8a57ae185f8fcb2ee1bd64777c79177a))
* initialize Astro project with PostgreSQL and Drizzle ORM ([#5](https://github.com/fx/salacia/issues/5)) ([4e51b7d](https://github.com/fx/salacia/commit/4e51b7d7908cd5b81dbaa1dfa23f2090abb73caa))
* **messages:** add complete Messages UI with pagination, filtering, and error handling ([#56](https://github.com/fx/salacia/issues/56)) ([0cf9397](https://github.com/fx/salacia/commit/0cf93976ed39632fb4599f77cca84672c6c87303))
* **messages:** add comprehensive database service layer ([#32](https://github.com/fx/salacia/issues/32)) ([97eb332](https://github.com/fx/salacia/commit/97eb332ef932f84ebbc6a7139f0dab6ad2d9a60a))
* **messages:** add comprehensive type definitions for AI message display ([#28](https://github.com/fx/salacia/issues/28)) ([1b7517c](https://github.com/fx/salacia/commit/1b7517cc1b7ea2a1049144ef90750cbd5929acd6))
* **messages:** add comprehensive unit tests for type definitions ([#31](https://github.com/fx/salacia/issues/31)) ([455784c](https://github.com/fx/salacia/commit/455784cbe67c7e2c6b8d86f57eeb7004b3c14656))
* **messages:** add comprehensive URL parameter and pagination utilities ([#30](https://github.com/fx/salacia/issues/30)) ([96fc2d5](https://github.com/fx/salacia/commit/96fc2d55404f963263e29c213c1aa4ddbbf7832c))
* **nav:** add connectivity status indicator with WebTUI badges ([aa79d02](https://github.com/fx/salacia/commit/aa79d028dcbd5a8ba93735c281de79c56335deac))
* **oauth:** provider factory OAuth integration ([#113](https://github.com/fx/salacia/issues/113)) ([ed1d3cb](https://github.com/fx/salacia/commit/ed1d3cbdeabf511a88a7887b92c765fc9a8d4c3c))
* **orm:** add sequelize dependencies and initial configuration ([#83](https://github.com/fx/salacia/issues/83)) ([d26dca6](https://github.com/fx/salacia/commit/d26dca68d3263f1454bc026c2b6993082e44d2cd))
* **orm:** migrate from Drizzle to Sequelize ORM ([#89](https://github.com/fx/salacia/issues/89)) ([3f48c20](https://github.com/fx/salacia/commit/3f48c2076517c2edcba32a43a2df0cef669342c6))
* remove Drizzle ORM and consolidate to Sequelize only ([5b0c519](https://github.com/fx/salacia/commit/5b0c51978af8e5f9ee3aee81a37394608d80d434))
* **schema:** add AI provider and interaction tables ([#9](https://github.com/fx/salacia/issues/9)) ([9182966](https://github.com/fx/salacia/commit/9182966d2d0ca6c99e72456a0cdec947941375fc))
* **settings:** add provider settings route ([#109](https://github.com/fx/salacia/issues/109)) ([#111](https://github.com/fx/salacia/issues/111)) ([327fdad](https://github.com/fx/salacia/commit/327fdad6b98d699db1476b57b780ca86e2bbbf90))
* **stats:** add statistics page with charts and real-time updates ([6157aaa](https://github.com/fx/salacia/commit/6157aaab9390030d277d73a8958c76057ba6f2c0))
* **test:** add Anthropic response fixtures ([#21](https://github.com/fx/salacia/issues/21)) ([c21b496](https://github.com/fx/salacia/commit/c21b496edde41ed651e8703317a878f9d7ff751c))
* **test:** add automated Claude Code integration test suite ([#25](https://github.com/fx/salacia/issues/25)) ([0b98df9](https://github.com/fx/salacia/commit/0b98df962613b29758e954c6e9a962ef6a7f81df))
* **test:** add basic test infrastructure with vitest and MSW ([#24](https://github.com/fx/salacia/issues/24)) ([390ebe6](https://github.com/fx/salacia/commit/390ebe6eb71f6ee774f5fa88579753c3d3f63c8e))
* **test:** add basic Vitest configuration and setup ([#16](https://github.com/fx/salacia/issues/16)) ([91a53be](https://github.com/fx/salacia/commit/91a53bef39b566e7efcecf9e19b0a3831b4242da))
* **test:** add comprehensive Anthropic request fixtures ([#18](https://github.com/fx/salacia/issues/18)) ([1abeb2c](https://github.com/fx/salacia/commit/1abeb2cb7971e08d72f240740362341a8409bed3))
* **test:** add comprehensive MSW handlers for Anthropic API ([#22](https://github.com/fx/salacia/issues/22)) ([3a2bdf0](https://github.com/fx/salacia/commit/3a2bdf0f118c51afad3ad3b5830a9cc261113904))
* **test:** add comprehensive request utilities and helpers ([#17](https://github.com/fx/salacia/issues/17)) ([05b3a86](https://github.com/fx/salacia/commit/05b3a86c296a45af38c103b9b4b9f037289f85d6))
* **theme:** implement Catppuccin terminal interface with WebTUI integration ([#63](https://github.com/fx/salacia/issues/63)) ([9b95314](https://github.com/fx/salacia/commit/9b9531498d5d7ef23e1ac1eb03181aa2cdfdf17a))
* **ui:** implement full-site bordered container with WebTUI styling ([0e22b73](https://github.com/fx/salacia/commit/0e22b73bcc9010413c58cb0d9f9c7b6f7461dadc))
* **ui:** show +N realtime badge and wrap messages in React tree ([86bff29](https://github.com/fx/salacia/commit/86bff29a5677d09fddd0f37c57a02ab5e7afb0a9))


### Bug Fixes

* **ci:** correct release-please workflow configuration ([#116](https://github.com/fx/salacia/issues/116)) ([3f1aab5](https://github.com/fx/salacia/commit/3f1aab5d370b9213d1bb9c4cb833ca2c41262c88))
* **layout:** consolidate to single shared layout ([#114](https://github.com/fx/salacia/issues/114)) ([e91b4d0](https://github.com/fx/salacia/commit/e91b4d079c4523a359989b8127059da692f5e610))
* load environment variables in API routes ([bfec5de](https://github.com/fx/salacia/commit/bfec5de94a48b0864fcd9be0cb914a65c21f1398))
* **realtime:** unify SSE message shape with DB and remove HTTP request events ([6a2aadd](https://github.com/fx/salacia/commit/6a2aadd8adbdb3f5f16a610c3830c1ec1ea952ef))
* remove --production flag from npm ci in runtime stage ([#106](https://github.com/fx/salacia/issues/106)) ([be62952](https://github.com/fx/salacia/commit/be629526a4bd003cc12f49d9e2da2f29ba3b45ad))

## Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
