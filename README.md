# 凡人修仙 / 修仙人生 DApp

五阶卷轴 NFT 分红系统，包含 Hardhat 合约和 Vite React 前端。

## 核心机制

- BNB 收入分配：80% 进入五阶分红池，20% 进入回购加 LP 储备。
- 分红池权重：练气 30%，筑基 15%，金丹 15%，元婴 20%，化神 20%。
- 代币为部署时一次性铸造的固定供应，后续无 owner 增发入口。
- 单地址只能持有一张不可转让卷轴 NFT。
- 升阶需要当前余额覆盖下一阶持币门槛和本次销毁数量，确保销毁后仍满足下一阶门槛。
- 持仓低于当前阶位门槛时，链上校验、领取或升阶会销毁卷轴并清空未领取分红。

## 五阶规则

| 阶位 | 名称 | 最低持币 | 升阶销毁 |
| --- | --- | ---: | ---: |
| 1 | 练气 | 100,000 | 0 |
| 2 | 筑基 | 200,000 | 50,000 |
| 3 | 金丹 | 400,000 | 150,000 |
| 4 | 元婴 | 800,000 | 400,000 |
| 5 | 化神 | 1,500,000 | 1,000,000 |

## 安装

```bash
npm install
```

## 合约

```bash
npm run compile
npm test
npx hardhat run scripts/deploy.js --network <network>
```

部署环境变量：

- `TOKEN_NAME`
- `TOKEN_SYMBOL`
- `INITIAL_SUPPLY`
- `SCROLL_NAME`
- `SCROLL_SYMBOL`

## 前端

复制 `.env.example` 为 `.env`，填入部署后的合约地址：

```bash
VITE_TOKEN_ADDRESS=
VITE_SCROLL_ADDRESS=
VITE_CHAIN_ID=56
VITE_CHAIN_NAME=BNB Chain
```

本地运行：

```bash
npm run dev
```

生产构建：

```bash
npm run build
```
