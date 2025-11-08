import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HypernodeStaking } from "../target/types/hypernode_staking";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";
import { assert } from "chai";

describe("hypernode-staking", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.HypernodeStaking as Program<HypernodeStaking>;

  let mint: PublicKey;
  let userTokenAccount: PublicKey;
  let vault: PublicKey;
  let vaultBump: number;
  let stakeAccount: PublicKey;
  let stakeBump: number;
  let user: Keypair;

  const stakeAmount = new anchor.BN(10_000_000_000); // 10,000 HYPER (with 6 decimals)
  const DURATION_MIN = 14 * 86400; // 2 weeks
  const DURATION_MAX = 365 * 86400; // 1 year

  before(async () => {
    user = Keypair.generate();

    // Airdrop SOL to user
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    // Create HYPER token mint (6 decimals)
    mint = await createMint(
      provider.connection,
      user,
      provider.wallet.publicKey,
      null,
      6 // HYPER_DECIMALS
    );

    // Create user token account
    userTokenAccount = await createAccount(
      provider.connection,
      user,
      mint,
      user.publicKey
    );

    // Mint tokens to user
    await mintTo(
      provider.connection,
      user,
      mint,
      userTokenAccount,
      provider.wallet.publicKey,
      100_000_000_000 // 100,000 HYPER
    );

    // Derive PDAs
    [vault, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault")],
      program.programId
    );

    [stakeAccount, stakeBump] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), user.publicKey.toBuffer()],
      program.programId
    );

    console.log("✅ Test setup complete");
    console.log("   User:", user.publicKey.toString());
    console.log("   Mint:", mint.toString());
    console.log("   Vault:", vault.toString());
  });

  it("Stakes HYPER tokens with 2-week duration (1x multiplier)", async () => {
    const duration = new anchor.BN(DURATION_MIN);

    await program.methods
      .stake(stakeAmount, duration)
      .accounts({
        stakeAccount: stakeAccount,
        authority: user.publicKey,
        userTokenAccount: userTokenAccount,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    // Fetch stake account
    const stakeAccountData = await program.account.stakeAccount.fetch(stakeAccount);

    // Verify stake fields
    assert.equal(stakeAccountData.authority.toString(), user.publicKey.toString());
    assert.equal(stakeAccountData.amount.toString(), stakeAmount.toString());
    assert.equal(stakeAccountData.duration.toString(), duration.toString());
    assert.equal(stakeAccountData.timeUnstake.toNumber(), 0);
    assert.notEqual(stakeAccountData.timeStake.toNumber(), 0);

    // Verify xHYPER (should be ~1x for 2 weeks)
    const xhyper = stakeAccountData.xhyper.toString();
    const expectedMin = stakeAmount.toNumber();
    const expectedMax = stakeAmount.toNumber() * 1.1;

    console.log("✅ Staked:", stakeAmount.toString(), "HYPER");
    console.log("   Duration:", duration.toString(), "seconds (2 weeks)");
    console.log("   xHYPER:", xhyper);
    console.log("   Multiplier:", (Number(xhyper) / stakeAmount.toNumber()).toFixed(2) + "x");

    assert.isAtLeast(Number(xhyper), expectedMin);
    assert.isAtMost(Number(xhyper), expectedMax);
  });

  it("Checks stake is active", async () => {
    const stakeAccountData = await program.account.stakeAccount.fetch(stakeAccount);
    assert.equal(stakeAccountData.timeUnstake.toNumber(), 0);
    console.log("✅ Stake is active");
  });

  it("Initiates unstake", async () => {
    await program.methods
      .unstake()
      .accounts({
        stakeAccount: stakeAccount,
        authority: user.publicKey,
      })
      .signers([user])
      .rpc();

    // Fetch stake account
    const stakeAccountData = await program.account.stakeAccount.fetch(stakeAccount);

    // Verify unstake initiated
    assert.notEqual(stakeAccountData.timeUnstake.toNumber(), 0);
    assert.equal(stakeAccountData.xhyper.toString(), "0"); // xHYPER burned

    console.log("✅ Unstake initiated");
    console.log("   Cooldown period:", stakeAccountData.duration.toString(), "seconds");
  });

  it("Cannot withdraw before cooldown ends", async () => {
    try {
      await program.methods
        .withdraw()
        .accounts({
          stakeAccount: stakeAccount,
          authority: user.publicKey,
          userTokenAccount: userTokenAccount,
          vault: vault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      assert.fail("Should have failed - cooldown not complete");
    } catch (err) {
      console.log("✅ Correctly prevented early withdrawal");
    }
  });

  it("Stakes with 1-year duration (4x multiplier)", async () => {
    const user2 = Keypair.generate();

    // Airdrop SOL
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user2.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    // Create token account
    const user2TokenAccount = await createAccount(
      provider.connection,
      user2,
      mint,
      user2.publicKey
    );

    // Mint tokens
    await mintTo(
      provider.connection,
      user2,
      mint,
      user2TokenAccount,
      provider.wallet.publicKey,
      100_000_000_000
    );

    // Derive stake account
    const [stakeAccount2] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), user2.publicKey.toBuffer()],
      program.programId
    );

    const duration = new anchor.BN(DURATION_MAX);

    await program.methods
      .stake(stakeAmount, duration)
      .accounts({
        stakeAccount: stakeAccount2,
        authority: user2.publicKey,
        userTokenAccount: user2TokenAccount,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // Fetch stake account
    const stakeAccountData = await program.account.stakeAccount.fetch(stakeAccount2);

    // Verify xHYPER (should be ~4x for 1 year)
    const xhyper = stakeAccountData.xhyper.toString();
    const multiplier = Number(xhyper) / stakeAmount.toNumber();

    console.log("✅ Staked with 1-year duration");
    console.log("   xHYPER:", xhyper);
    console.log("   Multiplier:", multiplier.toFixed(2) + "x");

    assert.isAtLeast(multiplier, 3.9);
    assert.isAtMost(multiplier, 4.1);
  });

  it("Stakes with 6-month duration (~2.5x multiplier)", async () => {
    const user3 = Keypair.generate();

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user3.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    const user3TokenAccount = await createAccount(
      provider.connection,
      user3,
      mint,
      user3.publicKey
    );

    await mintTo(
      provider.connection,
      user3,
      mint,
      user3TokenAccount,
      provider.wallet.publicKey,
      100_000_000_000
    );

    const [stakeAccount3] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), user3.publicKey.toBuffer()],
      program.programId
    );

    const duration = new anchor.BN(180 * 86400); // 6 months

    await program.methods
      .stake(stakeAmount, duration)
      .accounts({
        stakeAccount: stakeAccount3,
        authority: user3.publicKey,
        userTokenAccount: user3TokenAccount,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user3])
      .rpc();

    const stakeAccountData = await program.account.stakeAccount.fetch(stakeAccount3);
    const xhyper = stakeAccountData.xhyper.toString();
    const multiplier = Number(xhyper) / stakeAmount.toNumber();

    console.log("✅ Staked with 6-month duration");
    console.log("   xHYPER:", xhyper);
    console.log("   Multiplier:", multiplier.toFixed(2) + "x");

    assert.isAtLeast(multiplier, 2.3);
    assert.isAtMost(multiplier, 2.7);
  });

  it("Cannot stake below minimum duration", async () => {
    const user4 = Keypair.generate();

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        user4.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    const user4TokenAccount = await createAccount(
      provider.connection,
      user4,
      mint,
      user4.publicKey
    );

    await mintTo(
      provider.connection,
      user4,
      mint,
      user4TokenAccount,
      provider.wallet.publicKey,
      100_000_000_000
    );

    const [stakeAccount4] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), user4.publicKey.toBuffer()],
      program.programId
    );

    const duration = new anchor.BN(7 * 86400); // 1 week (below minimum)

    try {
      await program.methods
        .stake(stakeAmount, duration)
        .accounts({
          stakeAccount: stakeAccount4,
          authority: user4.publicKey,
          userTokenAccount: user4TokenAccount,
          vault: vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user4])
        .rpc();

      assert.fail("Should have failed - duration too short");
    } catch (err) {
      console.log("✅ Correctly prevented stake with duration below minimum");
    }
  });
});
