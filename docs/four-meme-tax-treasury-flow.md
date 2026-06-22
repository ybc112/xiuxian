# Four.meme 税收金库发射流程

## 结论

如果要做“税收进入金库，再进入卷轴分红”的新机制，Four.meme 创建代币时的 `Royalty Wallet / 资金接收钱包` 不能随便填老板钱包，应该填项目方提前部署好的税收金库合约地址。

## 正确顺序

1. 先部署 `CultivationTaxTreasury`
   - 这是 Four.meme 创建代币前就要准备好的金库地址。
   - Four.meme 页面里的 `Royalty Wallet / 资金接收钱包` 填这个地址。

2. 在 Four.meme 创建代币
   - 开启 Buy Tax / Sell Tax。
   - Tax Allocation 中把需要进项目机制的比例分配到 `Royalty Wallet`。
   - 创建成功后保存 Four.meme 生成的 `Token Address`。

3. 部署 `CultivationScroll`
   - 使用 Four.meme 生成的 `Token Address` 作为构造参数。
   - 这个合约负责卷轴 NFT、持仓门槛、升阶销毁、BNB 分红、20% 回购加 LP 储备。

4. 绑定金库到卷轴合约
   - 调用 `CultivationTaxTreasury.setRewardVault(scrollAddress)`。
   - 绑定后，任何人都可以调用 `routeToRewardVault(0)`，把金库当前全部 BNB 推入卷轴分红合约。

## 为什么不能直接填 `CultivationScroll`

`CultivationScroll` 部署时需要 Four.meme 已经创建出来的 `Token Address`，但 Four.meme 创建代币时又要求先填税收接收地址。因此需要一个不依赖 token 地址的前置金库合约。

## BNB 分配

Four.meme 税收先进入 `CultivationTaxTreasury`。路由到 `CultivationScroll` 后，由 `CultivationScroll` 自动按项目机制分配：

- 80% 进入五阶卷轴分红池。
- 20% 进入回购加 LP 储备。
- 五阶分红池权重：练气 30%，筑基 15%，金丹 15%，元婴 20%，化神 20%。

## 部署命令

部署税收金库：

```bash
npm run deploy:treasury -- --network <network>
```

Four.meme 发币完成后，部署卷轴合约并绑定金库：

```bash
TOKEN_ADDRESS=<four_token_address> TREASURY_ADDRESS=<tax_treasury_address> npm run deploy:scroll -- --network <network>
```

路由金库余额：

```text
调用 CultivationTaxTreasury.routeToRewardVault(0)
```
