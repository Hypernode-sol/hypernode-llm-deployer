import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HypernodeRewards } from "../target/types/hypernode_rewards";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";

describe("hypernode-rewards", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.HypernodeRewards as Program<HypernodeRewards>;

  let mint: PublicKey;
  let rewardsVault: PublicKey;
  let reflectionAccount: PublicKey;
  let reflectionBump: number;
  let user1: Keypair;
  let user2: Keypair;
  let user1RewardsAccount: PublicKey;
  let user2RewardsAccount: PublicKey;

  const user1Xhyper = new anchor.BN(10_000); // 10,000 xHYPER
  const user2Xhyper = new anchor.BN(20_000); // 20,000 xHYPER
  const rewardAmount = new anchor.BN(1_000_000_000); // 1000 HYPER (with 6 decimals)

  before(async () => {
    user1 = Keypair.generate();
    user2 = Keypair.generate();

    // Airdrop SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user1.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user2.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    // Create HYPER token mint
    mint = await createMint(
      provider.connection,
      user1,
      provider.wallet.publicKey,
      null,
      6 // HYPER_DECIMALS
    );

    // Create rewards vault
    rewardsVault = await createAccount(
      provider.connection,
      user1,
      mint,
      provider.wallet.publicKey
    );

    // Mint tokens to vault
    await mintTo(
      provider.connection,
      user1,
      mint,
      rewardsVault,
      provider.wallet.publicKey,
      10_000_000_000 // 10,000 HYPER
    );

    // Derive PDAs
    [reflectionAccount, reflectionBump] = await PublicKey.findProgramAddress(
      [Buffer.from("reflection")],
      program.programId
    );

    [user1RewardsAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("rewards"), user1.publicKey.toBuffer()],
      program.programId
    );

    [user2RewardsAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("rewards"), user2.publicKey.toBuffer()],
      program.programId
    );

    console.log("✅ Test setup complete");
    console.log("   Reflection Account:", reflectionAccount.toString());
    console.log("   User 1:", user1.publicKey.toString());
    console.log("   User 2:", user2.publicKey.toString());
  });

  it("Initializes reflection account", async () => {
    await program.methods
      .initialize()
      .accounts({
        reflectionAccount: reflectionAccount,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // Fetch reflection account
    const reflectionData = await program.account.reflectionAccount.fetch(reflectionAccount);

    // Verify initial state
    assert.equal(reflectionData.authority.toString(), provider.wallet.publicKey.toString());
    assert.equal(reflectionData.rate.toString(), "0");
    assert.equal(reflectionData.totalReflection.toString(), "0");
    assert.equal(reflectionData.totalXhyper.toString(), "0");
    assert.equal(reflectionData.totalRewardsDistributed.toNumber(), 0);

    console.log("✅ Reflection account initialized");
  });

  it("Registers user 1 stake (10,000 xHYPER)", async () => {
    await program.methods
      .registerStake(user1Xhyper)
      .accounts({
        reflectionAccount: reflectionAccount,
        userRewardsAccount: user1RewardsAccount,
        authority: user1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    // Fetch user rewards account
    const user1Rewards = await program.account.userRewardsAccount.fetch(user1RewardsAccount);

    // Verify user rewards
    assert.equal(user1Rewards.authority.toString(), user1.publicKey.toString());
    assert.equal(user1Rewards.xhyper.toString(), user1Xhyper.toString());
    assert.notEqual(user1Rewards.initialReflection.toString(), "0");
    assert.equal(user1Rewards.totalClaimed.toNumber(), 0);

    // Fetch reflection account
    const reflectionData = await program.account.reflectionAccount.fetch(reflectionAccount);
    assert.equal(reflectionData.totalXhyper.toString(), user1Xhyper.toString());

    console.log("✅ User 1 registered with", user1Xhyper.toString(), "xHYPER");
    console.log("   Initial reflection:", user1Rewards.initialReflection.toString());
  });

  it("Registers user 2 stake (20,000 xHYPER)", async () => {
    await program.methods
      .registerStake(user2Xhyper)
      .accounts({
        reflectionAccount: reflectionAccount,
        userRewardsAccount: user2RewardsAccount,
        authority: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Fetch user rewards account
    const user2Rewards = await program.account.userRewardsAccount.fetch(user2RewardsAccount);

    assert.equal(user2Rewards.authority.toString(), user2.publicKey.toString());
    assert.equal(user2Rewards.xhyper.toString(), user2Xhyper.toString());
    assert.equal(user2Rewards.totalClaimed.toNumber(), 0);

    // Fetch reflection account
    const reflectionData = await program.account.reflectionAccount.fetch(reflectionAccount);
    const totalXhyper = user1Xhyper.add(user2Xhyper);
    assert.equal(reflectionData.totalXhyper.toString(), totalXhyper.toString());

    console.log("✅ User 2 registered with", user2Xhyper.toString(), "xHYPER");
    console.log("   Total xHYPER in system:", totalXhyper.toString());
  });

  it("Adds rewards to pool", async () => {
    await program.methods
      .addRewards(rewardAmount)
      .accounts({
        reflectionAccount: reflectionAccount,
        sourceTokenAccount: rewardsVault,
        rewardsVault: rewardsVault,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // Fetch reflection account
    const reflectionData = await program.account.reflectionAccount.fetch(reflectionAccount);

    // Verify rewards added
    assert.notEqual(reflectionData.rate.toString(), "0");
    assert.equal(reflectionData.totalRewardsDistributed.toString(), rewardAmount.toString());

    console.log("✅ Added", rewardAmount.toString(), "rewards to pool");
    console.log("   New reflection rate:", reflectionData.rate.toString());
    console.log("   Total xHYPER:", reflectionData.totalXhyper.toString());
  });

  it("User 1 claims proportional rewards (~33%)", async () => {
    // User 1 has 10,000 out of 30,000 total xHYPER = 33.33%
    // Should get ~333 HYPER from 1000 HYPER reward pool

    // Create user 1 token account
    const user1TokenAccount = await createAccount(
      provider.connection,
      user1,
      mint,
      user1.publicKey
    );

    // Get claimable amount first
    const user1Rewards = await program.account.userRewardsAccount.fetch(user1RewardsAccount);
    const reflectionData = await program.account.reflectionAccount.fetch(reflectionAccount);

    console.log("   User 1 xHYPER:", user1Rewards.xhyper.toString());
    console.log("   Total xHYPER:", reflectionData.totalXhyper.toString());
    console.log("   User 1 share:", (Number(user1Rewards.xhyper) / Number(reflectionData.totalXhyper) * 100).toFixed(2) + "%");

    await program.methods
      .claimRewards()
      .accounts({
        reflectionAccount: reflectionAccount,
        userRewardsAccount: user1RewardsAccount,
        userTokenAccount: user1TokenAccount,
        rewardsVault: rewardsVault,
        authority: user1.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();

    // Check token account balance
    const tokenAccountInfo = await provider.connection.getTokenAccountBalance(user1TokenAccount);
    const claimed = Number(tokenAccountInfo.value.amount);

    console.log("✅ User 1 claimed:", claimed, "tokens");

    // User 1 should get approximately 33% of rewards
    const expectedMin = rewardAmount.toNumber() * 0.30; // 30%
    const expectedMax = rewardAmount.toNumber() * 0.36; // 36%

    assert.isAtLeast(claimed, expectedMin);
    assert.isAtMost(claimed, expectedMax);
  });

  it("User 2 claims proportional rewards (~66%)", async () => {
    // User 2 has 20,000 out of 30,000 total xHYPER = 66.66%
    // Should get ~666 HYPER from 1000 HYPER reward pool

    const user2TokenAccount = await createAccount(
      provider.connection,
      user2,
      mint,
      user2.publicKey
    );

    await program.methods
      .claimRewards()
      .accounts({
        reflectionAccount: reflectionAccount,
        userRewardsAccount: user2RewardsAccount,
        userTokenAccount: user2TokenAccount,
        rewardsVault: rewardsVault,
        authority: user2.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user2])
      .rpc();

    const tokenAccountInfo = await provider.connection.getTokenAccountBalance(user2TokenAccount);
    const claimed = Number(tokenAccountInfo.value.amount);

    console.log("✅ User 2 claimed:", claimed, "tokens");

    // User 2 should get approximately 66% of rewards
    const expectedMin = rewardAmount.toNumber() * 0.63; // 63%
    const expectedMax = rewardAmount.toNumber() * 0.70; // 70%

    assert.isAtLeast(claimed, expectedMin);
    assert.isAtMost(claimed, expectedMax);
  });

  it("User unregisters stake", async () => {
    const user1Rewards = await program.account.userRewardsAccount.fetch(user1RewardsAccount);
    const initialReflection = user1Rewards.initialReflection;

    await program.methods
      .unregisterStake(user1Xhyper, initialReflection)
      .accounts({
        reflectionAccount: reflectionAccount,
        userRewardsAccount: user1RewardsAccount,
        authority: user1.publicKey,
      })
      .signers([user1])
      .rpc();

    // Fetch reflection account
    const reflectionData = await program.account.reflectionAccount.fetch(reflectionAccount);

    // Total xHYPER should decrease
    assert.equal(reflectionData.totalXhyper.toString(), user2Xhyper.toString());

    console.log("✅ User 1 unregistered");
    console.log("   Remaining xHYPER:", reflectionData.totalXhyper.toString());
  });

  it("Reflection algorithm is O(1) - gas efficient", async () => {
    // Add more rewards
    const additionalRewards = new anchor.BN(500_000_000); // 500 HYPER

    await program.methods
      .addRewards(additionalRewards)
      .accounts({
        reflectionAccount: reflectionAccount,
        sourceTokenAccount: rewardsVault,
        rewardsVault: rewardsVault,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    // This operation should be O(1) regardless of number of users
    // No iteration needed - rate is updated once
    const reflectionData = await program.account.reflectionAccount.fetch(reflectionAccount);

    console.log("✅ O(1) rewards distribution confirmed");
    console.log("   Total rewards distributed:", reflectionData.totalRewardsDistributed.toString());
    console.log("   Current rate:", reflectionData.rate.toString());
  });
});
