# Providers

Renderer providers implement narrow domain interfaces and delegate real market/news requests to named Preload methods. External requests run in Electron Main with fixed HTTPS sources, bounded responses, validation, caching, and timeouts.

The default market and news services use ElectronMarketDataProvider and ElectronNewsProvider. Mock providers remain available for deterministic tests. Theme and LLM services remain explicit examples.

See [live data behavior](../../docs/LIVE_DATA.md) for sources, refresh rules, timing, and failure handling.
