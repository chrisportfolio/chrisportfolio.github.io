using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

public interface IRewardData
{
    public RewardType Type { get; }
    public void ClaimReward(string log = "");
    public Task<NetworkResult> ValidateReward();
}

public struct CurrencyRewardData : IRewardData
{
    public readonly RewardType Type => RewardType.Currency;
    public readonly CurrencyType CurrencyType;
    public readonly int Amount;

    public CurrencyRewardData(JToken jToken)
    {
        CurrencyType = (Currency)jToken.TryGetValue("currencyType", -1);
        Amount = jToken.TryGetValue("amount", -1);
    }

    /// <summary>
    /// Claims the reward by adding the specified amount of currency to the player's balance.
    /// </summary>
    public void ClaimReward(string log)
    {
        // Add the specified amount of currency to the player's balance
        SYSTEM.Get<EconomySystem>().AddCurrency(CurrencyType, Amount, "redeem_code");
    }

    /// <summary>
    /// Ensure this is claimable after the check is successful<br/>
    /// If this fails, the reward will be skipped
    /// </summary>
    /// <returns>An NetworkResult indicating the reward is valid or not</returns>
    public Task<NetworkResult> ValidateReward()
    {
        // Check if the currency type is either Coin or Diamond
        if (CurrencyType == CurrencyType.Coin || CurrencyType == CurrencyType.Diamond)
        {
            return Task.FromResult(AsyncResult.Success());
        }

        // Return a failed NetworkResult if the currency type is not Coin or Diamond
        return Task.FromResult(NetworkResult.Fail("Currency type not found."));
    }
}