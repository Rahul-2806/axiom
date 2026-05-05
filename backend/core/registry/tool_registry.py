"""
AXIOM — Dynamic Tool Registry
16 tools across all 5 domains.
"""
from typing import Any, Callable, Optional
import structlog
from db.models.schemas import ToolDefinition, AgentDomain, ToolRegistry

log = structlog.get_logger(__name__)


class DynamicToolRegistry:
    def __init__(self):
        self._tools: dict[str, ToolDefinition] = {}
        self._tool_fns: dict[str, Callable] = {}

    def register(self, name: str, description: str, domain: AgentDomain, fn: Callable, parameters: dict = None, version: str = "1.0.0") -> None:
        tool = ToolDefinition(name=name, description=description, domain=domain, parameters=parameters or {}, version=version)
        self._tools[name] = tool
        self._tool_fns[name] = fn
        log.info("tool_registered", name=name, domain=domain)

    def get_tool_fn(self, name: str) -> Optional[Callable]:
        return self._tool_fns.get(name)

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def get_for_domain(self, domain: AgentDomain) -> list[ToolDefinition]:
        return [t for t in self._tools.values() if t.domain == domain and t.enabled]

    def list_all(self) -> list[ToolDefinition]:
        return list(self._tools.values())

    def disable(self, name: str) -> None:
        if name in self._tools:
            self._tools[name].enabled = False

    def enable(self, name: str) -> None:
        if name in self._tools:
            self._tools[name].enabled = True

    def to_dict(self) -> dict:
        return {name: tool.model_dump() for name, tool in self._tools.items()}


# ── Tool Implementations ───────────────────────────────────────

# WEB TOOLS

async def _web_search(query: str) -> str:
    """DuckDuckGo search."""
    import httpx
    try:
        url = f"https://api.duckduckgo.com/?q={query}&format=json&no_html=1&skip_disambig=1"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            data = r.json()
            abstract = data.get("AbstractText", "")
            related = [r["Text"] for r in data.get("RelatedTopics", [])[:5] if "Text" in r]
            result = abstract or "\n".join(related) or "No results found."
            return result[:3000]
    except Exception as e:
        return f"Search error: {str(e)}"


async def _scrape_url(url: str) -> str:
    """Scrape and extract text from a URL."""
    import httpx
    from html.parser import HTMLParser

    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text = []
            self._skip = False
        def handle_starttag(self, tag, attrs):
            if tag in ("script", "style", "nav", "footer", "head"):
                self._skip = True
        def handle_endtag(self, tag):
            if tag in ("script", "style", "nav", "footer", "head"):
                self._skip = False
        def handle_data(self, data):
            if not self._skip and data.strip():
                self.text.append(data.strip())

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0 AXIOM/1.0"})
            parser = TextExtractor()
            parser.feed(r.text)
            return " ".join(parser.text)[:4000]
    except Exception as e:
        return f"Scrape error: {str(e)}"


async def _get_news(topic: str) -> str:
    """Get latest news on a topic via RSS/DuckDuckGo News."""
    import httpx
    try:
        url = f"https://api.duckduckgo.com/?q={topic}&format=json&no_html=1"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            data = r.json()
            results = data.get("RelatedTopics", [])
            news = []
            for item in results[:8]:
                if "Text" in item and "FirstURL" in item:
                    news.append(f"• {item['Text']}\n  {item['FirstURL']}")
            return "\n\n".join(news) if news else f"No recent news found for: {topic}"
    except Exception as e:
        return f"News error: {str(e)}"


async def _check_website_status(url: str) -> str:
    """Check if a website is up and get basic info."""
    import httpx
    import time
    try:
        start = time.time()
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            r = await client.get(url)
            latency = round((time.time() - start) * 1000)
            return f"Status: {r.status_code} {'OK' if r.status_code < 400 else 'ERROR'}\nLatency: {latency}ms\nFinal URL: {r.url}\nContent-Type: {r.headers.get('content-type', 'unknown')}"
    except Exception as e:
        return f"Website unreachable: {str(e)}"


# FINANCE TOOLS

async def _get_stock_price(ticker: str) -> str:
    """Fetch stock price from Yahoo Finance."""
    import httpx
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5d"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            data = r.json()
            meta = data["chart"]["result"][0]["meta"]
            price = meta.get("regularMarketPrice", "N/A")
            prev = meta.get("previousClose", price)
            change = round(((price - prev) / prev) * 100, 2) if prev else 0
            currency = meta.get("currency", "USD")
            name = meta.get("shortName", ticker)
            return f"{name} ({ticker.upper()})\nPrice: {currency} {price:,.2f}\nChange: {'+' if change >= 0 else ''}{change}%\nPrev Close: {currency} {prev:,.2f}"
    except Exception as e:
        return f"Could not fetch {ticker}: {str(e)}"


async def _get_crypto_price(symbol: str) -> str:
    """Fetch crypto price from CoinGecko."""
    import httpx
    coin_map = {
        "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana",
        "BNB": "binancecoin", "XRP": "ripple", "ADA": "cardano",
        "DOGE": "dogecoin", "MATIC": "matic-network", "DOT": "polkadot",
        "AVAX": "avalanche-2", "LINK": "chainlink", "UNI": "uniswap"
    }
    coin_id = coin_map.get(symbol.upper(), symbol.lower())
    try:
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            data = r.json()
            if coin_id in data:
                d = data[coin_id]
                price = d.get("usd", "N/A")
                change = d.get("usd_24h_change", 0)
                mcap = d.get("usd_market_cap", 0)
                return f"{symbol.upper()}: ${price:,.2f}\n24h Change: {'+' if change >= 0 else ''}{change:.2f}%\nMarket Cap: ${mcap:,.0f}"
            return f"Price not found for {symbol}"
    except Exception as e:
        return f"Crypto error: {str(e)}"


async def _get_forex_rate(pair: str) -> str:
    """Get forex exchange rate."""
    import httpx
    try:
        parts = pair.upper().replace("/", "").replace("-", "")
        base = parts[:3]
        quote = parts[3:] if len(parts) >= 6 else "USD"
        url = f"https://api.frankfurter.app/latest?from={base}&to={quote}"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            data = r.json()
            rate = data.get("rates", {}).get(quote, "N/A")
            return f"{base}/{quote}: {rate}\nDate: {data.get('date', 'N/A')}"
    except Exception as e:
        return f"Forex error: {str(e)}"


async def _get_market_summary() -> str:
    """Get overall market summary (major indices)."""
    import httpx
    tickers = {"^GSPC": "S&P 500", "^DJI": "Dow Jones", "^IXIC": "NASDAQ", "^VIX": "VIX"}
    results = []
    async with httpx.AsyncClient(timeout=10) as client:
        for ticker, name in tickers.items():
            try:
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d"
                r = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                data = r.json()
                meta = data["chart"]["result"][0]["meta"]
                price = meta.get("regularMarketPrice", 0)
                prev = meta.get("previousClose", price)
                change = round(((price - prev) / prev) * 100, 2) if prev else 0
                results.append(f"{name}: {price:,.2f} ({'+' if change >= 0 else ''}{change}%)")
            except Exception:
                results.append(f"{name}: unavailable")
    return "\n".join(results)


# CODE TOOLS

async def _run_python(code: str) -> str:
    """Execute Python code safely with timeout."""
    import subprocess
    import tempfile
    import os
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
        f.write(code)
        tmp_path = f.name
    try:
        result = subprocess.run(["python", tmp_path], capture_output=True, text=True, timeout=15)
        output = result.stdout or result.stderr
        return output[:3000] or "Code ran with no output."
    except subprocess.TimeoutExpired:
        return "Execution timed out (15s limit)."
    except Exception as e:
        return f"Execution error: {str(e)}"
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


async def _search_github(query: str) -> str:
    """Search GitHub repositories."""
    import httpx
    try:
        url = f"https://api.github.com/search/repositories?q={query}&sort=stars&order=desc&per_page=5"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, headers={"Accept": "application/vnd.github.v3+json"})
            data = r.json()
            repos = data.get("items", [])
            results = []
            for repo in repos:
                results.append(
                    f"**{repo['full_name']}** ⭐ {repo['stargazers_count']:,}\n"
                    f"{repo.get('description', 'No description')}\n"
                    f"{repo['html_url']}"
                )
            return "\n\n".join(results) if results else "No repositories found."
    except Exception as e:
        return f"GitHub search error: {str(e)}"


async def _get_pypi_info(package: str) -> str:
    """Get Python package info from PyPI."""
    import httpx
    try:
        url = f"https://pypi.org/pypi/{package}/json"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            if r.status_code == 404:
                return f"Package '{package}' not found on PyPI."
            data = r.json()
            info = data["info"]
            return (
                f"**{info['name']}** v{info['version']}\n"
                f"{info.get('summary', 'No summary')}\n"
                f"Author: {info.get('author', 'Unknown')}\n"
                f"License: {info.get('license', 'Unknown')}\n"
                f"Install: pip install {info['name']}\n"
                f"URL: {info.get('project_url', info.get('home_page', 'N/A'))}"
            )
    except Exception as e:
        return f"PyPI error: {str(e)}"


# RESEARCH TOOLS

async def _search_arxiv(query: str) -> str:
    """Search academic papers on arXiv."""
    import httpx
    import xml.etree.ElementTree as ET
    try:
        url = f"http://export.arxiv.org/api/query?search_query=all:{query}&max_results=5&sortBy=relevance"
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            root = ET.fromstring(r.text)
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            entries = root.findall("atom:entry", ns)
            results = []
            for entry in entries[:5]:
                title = entry.find("atom:title", ns).text.strip().replace("\n", " ")
                summary = entry.find("atom:summary", ns).text.strip()[:300]
                link = entry.find("atom:id", ns).text.strip()
                authors = [a.find("atom:name", ns).text for a in entry.findall("atom:author", ns)[:3]]
                results.append(f"**{title}**\nAuthors: {', '.join(authors)}\n{summary}...\n{link}")
            return "\n\n---\n\n".join(results) if results else "No papers found."
    except Exception as e:
        return f"arXiv error: {str(e)}"


async def _search_wikipedia(query: str) -> str:
    """Search and summarize Wikipedia articles."""
    import httpx
    try:
        search_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{query.replace(' ', '_')}"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(search_url)
            if r.status_code == 200:
                data = r.json()
                return f"**{data['title']}**\n\n{data.get('extract', 'No content available.')[:2000]}\n\nSource: {data.get('content_urls', {}).get('desktop', {}).get('page', 'Wikipedia')}"
            else:
                url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={query}&limit=3&format=json"
                r2 = await client.get(url)
                data = r2.json()
                if data[1]:
                    return f"Found: {', '.join(data[1][:3])}\nTry a more specific query."
                return f"No Wikipedia article found for: {query}"
    except Exception as e:
        return f"Wikipedia error: {str(e)}"


# ── Initialize Registry ────────────────────────────────────────

tool_registry = DynamicToolRegistry()

# Web tools
tool_registry.register("web_search", "Search the web for information", AgentDomain.WEB, _web_search, {"query": "string"})
tool_registry.register("scrape_url", "Extract text content from a URL", AgentDomain.WEB, _scrape_url, {"url": "string"})
tool_registry.register("get_news", "Get latest news on a topic", AgentDomain.WEB, _get_news, {"topic": "string"})
tool_registry.register("check_website_status", "Check if a website is up", AgentDomain.WEB, _check_website_status, {"url": "string"})

# Finance tools
tool_registry.register("get_stock_price", "Fetch real-time stock price", AgentDomain.FINANCE, _get_stock_price, {"ticker": "string"})
tool_registry.register("get_crypto_price", "Fetch cryptocurrency price", AgentDomain.FINANCE, _get_crypto_price, {"symbol": "string"})
tool_registry.register("get_forex_rate", "Get forex exchange rate", AgentDomain.FINANCE, _get_forex_rate, {"pair": "string"})
tool_registry.register("get_market_summary", "Get major market indices summary", AgentDomain.FINANCE, _get_market_summary, {})

# Code tools
tool_registry.register("run_python", "Execute Python code", AgentDomain.CODE, _run_python, {"code": "string"})
tool_registry.register("search_github", "Search GitHub repositories", AgentDomain.CODE, _search_github, {"query": "string"})
tool_registry.register("get_pypi_info", "Get Python package info from PyPI", AgentDomain.CODE, _get_pypi_info, {"package": "string"})

# Research tools
tool_registry.register("search_arxiv", "Search academic papers", AgentDomain.RESEARCH, _search_arxiv, {"query": "string"})
tool_registry.register("search_wikipedia", "Search and summarize Wikipedia", AgentDomain.RESEARCH, _search_wikipedia, {"query": "string"})