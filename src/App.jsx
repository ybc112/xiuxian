import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  ArrowUpCircle,
  BadgeCheck,
  Coins,
  Flame,
  Gem,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { SCROLL_ABI, TOKEN_ABI } from "./abi";

const ZERO_PROFILE = {
  account: "",
  balance: 0n,
  allowance: 0n,
  tier: 0,
  tokenId: 0n,
  pending: 0n,
};

const ZERO_TOTALS = {
  activeScrolls: 0n,
  totalDividendReceived: 0n,
  totalClaimed: 0n,
  buybackLpReserve: 0n,
};

const TIER_BLUEPRINTS = [
  {
    id: 1,
    name: "练气",
    label: "初入道途",
    asset: "/art/tier-1.webp",
    dividendShare: "30%",
    totalShare: "24%",
    staticMin: "100,000",
    staticBurn: "0",
    staticMinValue: ethers.parseEther("100000"),
    staticBurnValue: 0n,
  },
  {
    id: 2,
    name: "筑基",
    label: "灵台稳固",
    asset: "/art/tier-2.webp",
    dividendShare: "15%",
    totalShare: "12%",
    staticMin: "200,000",
    staticBurn: "50,000",
    staticMinValue: ethers.parseEther("200000"),
    staticBurnValue: ethers.parseEther("50000"),
  },
  {
    id: 3,
    name: "金丹",
    label: "丹成一转",
    asset: "/art/tier-3.webp",
    dividendShare: "15%",
    totalShare: "12%",
    staticMin: "400,000",
    staticBurn: "150,000",
    staticMinValue: ethers.parseEther("400000"),
    staticBurnValue: ethers.parseEther("150000"),
  },
  {
    id: 4,
    name: "元婴",
    label: "神游天地",
    asset: "/art/tier-4.webp",
    dividendShare: "20%",
    totalShare: "16%",
    staticMin: "800,000",
    staticBurn: "400,000",
    staticMinValue: ethers.parseEther("800000"),
    staticBurnValue: ethers.parseEther("400000"),
  },
  {
    id: 5,
    name: "化神",
    label: "大道将成",
    asset: "/art/tier-5.webp",
    dividendShare: "20%",
    totalShare: "16%",
    staticMin: "1,500,000",
    staticBurn: "1,000,000",
    staticMinValue: ethers.parseEther("1500000"),
    staticBurnValue: ethers.parseEther("1000000"),
  },
];

const CHAIN_PRESETS = {
  56: {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org/"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  97: {
    chainId: "0x61",
    chainName: "BNB Smart Chain Testnet",
    nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
    rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545/"],
    blockExplorerUrls: ["https://testnet.bscscan.com"],
  },
};

const CONFIG = {
  tokenAddress: import.meta.env.VITE_TOKEN_ADDRESS || "",
  scrollAddress: import.meta.env.VITE_SCROLL_ADDRESS || "",
  chainId: Number(import.meta.env.VITE_CHAIN_ID || 56),
  chainName: import.meta.env.VITE_CHAIN_NAME || "BNB Chain",
};

function isConfiguredAddress(value) {
  return value && ethers.isAddress(value);
}

function shortAddress(value) {
  if (!value) return "未连接";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatToken(value, decimals = 18, precision = 2) {
  const number = Number(ethers.formatUnits(value || 0n, decimals));
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("en-US", {
    maximumFractionDigits: precision,
  });
}

function formatBNB(value, precision = 4) {
  const number = Number(ethers.formatEther(value || 0n));
  if (!Number.isFinite(number)) return "0 BNB";
  return `${number.toLocaleString("en-US", {
    maximumFractionDigits: precision,
  })} BNB`;
}

function progressOf(balance, required) {
  if (!required || required <= 0n) return 100;
  const basis = Number((balance * 10000n) / required) / 100;
  return Math.max(0, Math.min(100, basis));
}

function App() {
  const [wallet, setWallet] = useState({ account: "", chainId: null });
  const [profile, setProfile] = useState(ZERO_PROFILE);
  const [totals, setTotals] = useState(ZERO_TOTALS);
  const [tiers, setTiers] = useState(TIER_BLUEPRINTS);
  const [tokenInfo, setTokenInfo] = useState({ decimals: 18, symbol: "XIU" });
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const hasContracts =
    isConfiguredAddress(CONFIG.tokenAddress) && isConfiguredAddress(CONFIG.scrollAddress);
  const hasProvider = typeof window !== "undefined" && Boolean(window.ethereum);
  const wrongNetwork =
    wallet.chainId !== null && CONFIG.chainId && Number(wallet.chainId) !== CONFIG.chainId;
  const currentTier = tiers.find((tier) => tier.id === profile.tier);
  const nextTier = profile.tier > 0 && profile.tier < 5 ? tiers[profile.tier] : null;
  const activeTarget = profile.tier === 0 ? tiers[0] : currentTier;
  const registerMin = tiers[0]?.minHolding ?? tiers[0]?.staticMinValue ?? 0n;
  const nextBurn = nextTier?.burnCost ?? nextTier?.staticBurnValue ?? 0n;
  const nextMin =
    nextTier?.minHolding ??
    nextTier?.staticMinValue ??
    activeTarget?.minHolding ??
    activeTarget?.staticMinValue ??
    0n;
  const progressLabel =
    profile.tier === 0 ? "登记门槛" : profile.tier >= 5 ? "当前门槛" : "下一阶门槛";
  const canRegister =
    hasContracts &&
    wallet.account &&
    !wrongNetwork &&
    profile.tier === 0 &&
    profile.balance >= registerMin;
  const canApprove =
    hasContracts &&
    wallet.account &&
    !wrongNetwork &&
    profile.tier > 0 &&
    profile.tier < 5 &&
    profile.balance >= nextMin &&
    nextBurn > 0n &&
    profile.allowance < nextBurn;
  const canUpgrade =
    hasContracts &&
    wallet.account &&
    !wrongNetwork &&
    profile.tier > 0 &&
    profile.tier < 5 &&
    profile.balance >= nextMin &&
    profile.allowance >= nextBurn;
  const canClaim = hasContracts && wallet.account && !wrongNetwork && profile.pending > 0n;

  const getProvider = useCallback(() => {
    if (!window.ethereum) {
      throw new Error("未检测到钱包插件");
    }
    return new ethers.BrowserProvider(window.ethereum);
  }, []);

  const refresh = useCallback(
    async (accountOverride) => {
      if (!hasContracts || !hasProvider) return;
      const account = accountOverride || wallet.account;
      if (!account) return;

      try {
        const provider = getProvider();
        const network = await provider.getNetwork();
        const token = new ethers.Contract(CONFIG.tokenAddress, TOKEN_ABI, provider);
        const scroll = new ethers.Contract(CONFIG.scrollAddress, SCROLL_ABI, provider);

        const [decimals, symbol] = await Promise.all([
          token.decimals().catch(() => 18),
          token.symbol().catch(() => "XIU"),
        ]);

        const [
          balance,
          allowance,
          tokenId,
          userTier,
          pending,
          activeScrolls,
          totalDividendReceived,
          totalClaimed,
          buybackLpReserve,
        ] = await Promise.all([
          token.balanceOf(account),
          token.allowance(account, CONFIG.scrollAddress),
          scroll.scrollOf(account),
          scroll.tierOf(account),
          scroll.pendingReward(account),
          scroll.activeScrolls(),
          scroll.totalDividendReceived(),
          scroll.totalClaimed(),
          scroll.buybackLpReserve(),
        ]);

        const tierRows = await Promise.all(
          TIER_BLUEPRINTS.map(async (tier) => {
            const [minHolding, burnCost, supply, weightBps, unallocated] =
              await Promise.all([
                scroll.minHoldings(tier.id),
                scroll.upgradeBurnCosts(tier.id),
                scroll.tierSupply(tier.id),
                scroll.tierWeightBps(tier.id),
                scroll.unallocatedTierRewards(tier.id),
              ]);

            return {
              ...tier,
              minHolding,
              burnCost,
              supply,
              weightBps: Number(weightBps),
              unallocated,
            };
          })
        );

        setWallet({ account, chainId: Number(network.chainId) });
        setTokenInfo({ decimals: Number(decimals), symbol });
        setProfile({
          account,
          balance,
          allowance,
          tier: Number(userTier),
          tokenId,
          pending,
        });
        setTotals({
          activeScrolls,
          totalDividendReceived,
          totalClaimed,
          buybackLpReserve,
        });
        setTiers(tierRows);
        setLastUpdated(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
      } catch (error) {
        setNotice(error?.shortMessage || error?.message || "读取链上数据失败");
      }
    },
    [getProvider, hasContracts, hasProvider, wallet.account]
  );

  const connectWallet = useCallback(async () => {
    if (!hasProvider) {
      setNotice("请先安装或打开支持 EVM 的钱包");
      return;
    }

    try {
      setBusy("connect");
      const provider = getProvider();
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const network = await provider.getNetwork();
      const account = ethers.getAddress(accounts[0]);
      setWallet({ account, chainId: Number(network.chainId) });
      setNotice("");
      await refresh(account);
    } catch (error) {
      setNotice(error?.shortMessage || error?.message || "连接钱包失败");
    } finally {
      setBusy("");
    }
  }, [getProvider, hasProvider, refresh]);

  const switchNetwork = useCallback(async () => {
    if (!hasProvider) return;
    const preset = CHAIN_PRESETS[CONFIG.chainId];
    const chainId = preset?.chainId || `0x${CONFIG.chainId.toString(16)}`;

    try {
      setBusy("network");
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });
      await refresh();
    } catch (error) {
      if (error?.code === 4902 && preset) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [preset],
        });
        await refresh();
      } else {
        setNotice(error?.shortMessage || error?.message || "切换网络失败");
      }
    } finally {
      setBusy("");
    }
  }, [hasProvider, refresh]);

  const withSigner = useCallback(async () => {
    const provider = getProvider();
    return provider.getSigner();
  }, [getProvider]);

  const runTransaction = useCallback(
    async (kind, action, successMessage) => {
      if (!hasContracts) {
        setNotice("请先配置合约地址");
        return;
      }

      try {
        setBusy(kind);
        setNotice("");
        const signer = await withSigner();
        const tx = await action(signer);
        setNotice("交易已提交，等待确认");
        await tx.wait();
        setNotice(successMessage);
        await refresh();
      } catch (error) {
        setNotice(error?.shortMessage || error?.reason || error?.message || "交易失败");
      } finally {
        setBusy("");
      }
    },
    [hasContracts, refresh, withSigner]
  );

  const register = () =>
    runTransaction("register", async (signer) => {
      const scroll = new ethers.Contract(CONFIG.scrollAddress, SCROLL_ABI, signer);
      return scroll.register();
    }, "练气卷轴已登记");

  const approveUpgrade = () =>
    runTransaction("approve", async (signer) => {
      const token = new ethers.Contract(CONFIG.tokenAddress, TOKEN_ABI, signer);
      return token.approve(CONFIG.scrollAddress, nextBurn);
    }, "升阶销毁额度已授权");

  const upgrade = () =>
    runTransaction("upgrade", async (signer) => {
      const scroll = new ethers.Contract(CONFIG.scrollAddress, SCROLL_ABI, signer);
      return scroll.upgrade();
    }, "卷轴升阶完成");

  const claim = () =>
    runTransaction("claim", async (signer) => {
      const scroll = new ethers.Contract(CONFIG.scrollAddress, SCROLL_ABI, signer);
      return scroll.claim();
    }, "BNB 分红已领取");

  const validateHolding = () =>
    runTransaction("validate", async (signer) => {
      const scroll = new ethers.Contract(CONFIG.scrollAddress, SCROLL_ABI, signer);
      return scroll.validateHolding(wallet.account);
    }, "持仓校验完成");

  useEffect(() => {
    if (!hasProvider) return undefined;

    const handleAccounts = (accounts) => {
      if (!accounts.length) {
        setWallet({ account: "", chainId: null });
        setProfile(ZERO_PROFILE);
        return;
      }
      refresh(ethers.getAddress(accounts[0]));
    };

    const handleChain = () => refresh();

    window.ethereum.on?.("accountsChanged", handleAccounts);
    window.ethereum.on?.("chainChanged", handleChain);

    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccounts);
      window.ethereum.removeListener?.("chainChanged", handleChain);
    };
  }, [hasProvider, refresh]);

  const holdingProgress = useMemo(
    () => progressOf(profile.balance, nextMin),
    [nextMin, profile.balance]
  );

  return (
    <main className="app-shell">
      <section className="hero-band">
        <nav className="topbar">
          <div className="brand-mark">
            <span className="brand-script">凡人修仙</span>
            <span className="brand-sub">修仙人生 · 五阶卷轴分红</span>
          </div>

          <button className="connect-button" onClick={connectWallet} disabled={busy === "connect"}>
            <Wallet size={19} aria-hidden="true" />
            <span>{wallet.account ? shortAddress(wallet.account) : "连接钱包"}</span>
          </button>
        </nav>

        <div className="ledger-grid">
          <section className="status-panel">
            <div className="panel-heading">
              <span>我的卷轴</span>
              <button
                className="ghost-button"
                onClick={() => refresh()}
                disabled={!wallet.account || busy === "refresh"}
              >
                <RefreshCcw size={16} aria-hidden="true" />
                <span>刷新</span>
              </button>
            </div>

            <div className="cultivation-title">
              <span className="chapter">卷一</span>
              <h1>{currentTier ? currentTier.name : "未持有卷轴"}</h1>
              <p>
                {currentTier
                  ? `${currentTier.label} · 第 ${profile.tier} 阶`
                  : "持仓达标即可登记练气卷轴"}
              </p>
            </div>

            <div className="stat-grid">
              <div>
                <span>钱包</span>
                <strong>{shortAddress(wallet.account)}</strong>
              </div>
              <div>
                <span>代币持仓</span>
                <strong>
                  {formatToken(profile.balance, tokenInfo.decimals)} {tokenInfo.symbol}
                </strong>
              </div>
              <div>
                <span>可领分红</span>
                <strong>{formatBNB(profile.pending)}</strong>
              </div>
              <div>
                <span>卷轴 ID</span>
                <strong>{profile.tokenId > 0n ? profile.tokenId.toString() : "-"}</strong>
              </div>
            </div>

            <div className="progress-block">
              <div className="progress-copy">
                <span>{progressLabel}</span>
                <strong>
                  {formatToken(nextMin, tokenInfo.decimals, 0)} {tokenInfo.symbol}
                </strong>
              </div>
              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${holdingProgress}%` }} />
              </div>
            </div>

            <div className="action-row">
              <button onClick={register} disabled={!canRegister || Boolean(busy)}>
                <ScrollText size={18} aria-hidden="true" />
                <span>注册</span>
              </button>
              <button onClick={approveUpgrade} disabled={!canApprove || Boolean(busy)}>
                <ShieldCheck size={18} aria-hidden="true" />
                <span>授权</span>
              </button>
              <button onClick={upgrade} disabled={!canUpgrade || Boolean(busy)}>
                <ArrowUpCircle size={18} aria-hidden="true" />
                <span>升阶</span>
              </button>
              <button onClick={claim} disabled={!canClaim || Boolean(busy)}>
                <Coins size={18} aria-hidden="true" />
                <span>领取</span>
              </button>
            </div>

            <button
              className="validate-button"
              onClick={validateHolding}
              disabled={!wallet.account || !hasContracts || wrongNetwork || Boolean(busy)}
            >
              <BadgeCheck size={18} aria-hidden="true" />
              <span>校验持仓权限</span>
            </button>
          </section>

          <section className="reserve-panel">
            <div className="seal-card">
              <span>全网首创</span>
              <strong>DApp 燃烧分红</strong>
            </div>

            <div className="split-list">
              <div>
                <span>BNB 分红池</span>
                <strong>80%</strong>
              </div>
              <div>
                <span>回购加 LP</span>
                <strong>20%</strong>
              </div>
            </div>

            <div className="reserve-stat">
              <span>底池储备</span>
              <strong>{formatBNB(totals.buybackLpReserve)}</strong>
            </div>

            <div className="reserve-stat">
              <span>累计分红</span>
              <strong>{formatBNB(totals.totalDividendReceived)}</strong>
            </div>

            <div className="reserve-stat">
              <span>已领取</span>
              <strong>{formatBNB(totals.totalClaimed)}</strong>
            </div>

            <button
              className="network-button"
              onClick={switchNetwork}
              disabled={!wrongNetwork || busy === "network"}
            >
              <Wallet size={18} aria-hidden="true" />
              <span>{wrongNetwork ? `切换到 ${CONFIG.chainName}` : CONFIG.chainName}</span>
            </button>
          </section>
        </div>
      </section>

      <section className="protocol-strip">
        <div>
          <span>活跃卷轴</span>
          <strong>{totals.activeScrolls.toString()}</strong>
        </div>
        <div>
          <span>当前阶位</span>
          <strong>{currentTier?.name || "未登记"}</strong>
        </div>
        <div>
          <span>下次销毁</span>
          <strong>
            {nextTier
              ? `${formatToken(nextBurn, tokenInfo.decimals, 0)} ${tokenInfo.symbol}`
              : "-"}
          </strong>
        </div>
        <div>
          <span>更新</span>
          <strong>{lastUpdated || "-"}</strong>
        </div>
      </section>

      {(!hasContracts || wrongNetwork || notice) && (
        <section className="notice-panel">
          {!hasContracts && (
            <p>
              合约地址待配置：在 <code>.env</code> 填入 <code>VITE_TOKEN_ADDRESS</code> 与{" "}
              <code>VITE_SCROLL_ADDRESS</code>。
            </p>
          )}
          {wrongNetwork && <p>当前钱包网络与 {CONFIG.chainName} 不一致。</p>}
          {notice && <p>{notice}</p>}
        </section>
      )}

      <section className="tiers-section">
        <div className="section-heading">
          <span>卷二</span>
          <h2>五阶分润</h2>
        </div>

        <div className="tiers-grid">
          {tiers.map((tier) => {
            const isCurrent = profile.tier === tier.id;
            const isUnlocked = profile.tier >= tier.id;

            return (
              <article
                className={`tier-card ${isCurrent ? "is-current" : ""}`}
                key={tier.id}
              >
                <img src={tier.asset} alt={`${tier.name}卷轴`} />
                <div className="tier-content">
                  <span className="tier-index">第 {tier.id} 阶</span>
                  <h3>{tier.name}</h3>
                  <p>{tier.label}</p>
                  <dl>
                    <div>
                      <dt>分红池占比</dt>
                      <dd>{tier.dividendShare}</dd>
                    </div>
                    <div>
                      <dt>总收入占比</dt>
                      <dd>{tier.totalShare}</dd>
                    </div>
                    <div>
                      <dt>持币门槛</dt>
                      <dd>
                        {tier.minHolding
                          ? formatToken(tier.minHolding, tokenInfo.decimals, 0)
                          : tier.staticMin}
                      </dd>
                    </div>
                    <div>
                      <dt>升阶销毁</dt>
                      <dd>
                        {tier.burnCost
                          ? formatToken(tier.burnCost, tokenInfo.decimals, 0)
                          : tier.staticBurn}
                      </dd>
                    </div>
                  </dl>
                  <div className="tier-footer">
                    <span>{isCurrent ? "当前阶位" : isUnlocked ? "已达成" : "待突破"}</span>
                    <strong>{tier.supply ? tier.supply.toString() : "0"} 份</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mechanism-section">
        <div>
          <Flame size={20} aria-hidden="true" />
          <span>销毁升阶</span>
          <strong>5万 / 15万 / 40万 / 100万</strong>
        </div>
        <div>
          <Gem size={20} aria-hidden="true" />
          <span>卷轴规则</span>
          <strong>单地址一卷，低于门槛销毁</strong>
        </div>
        <div>
          <Coins size={20} aria-hidden="true" />
          <span>BNB 收益</span>
          <strong>按阶池实时累积</strong>
        </div>
      </section>
    </main>
  );
}

export default App;
