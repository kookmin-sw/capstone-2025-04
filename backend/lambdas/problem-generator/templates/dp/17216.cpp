// BOJ - 17216 가장 큰 감소 부분 수열

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 1001
 
using namespace std;

ll arr[MAXN] = {0, }, dp[MAXN] = {0, }; 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n; cin >> n;
    loop(i, 1, n) { cin >> arr[i]; dp[i] = arr[i]; }

    loop(i, 1, n) {
        loop(j, 1, i - 1) {
            if(arr[i] < arr[j]) dp[i] = max(dp[i], dp[j] + arr[i]);
        }
    }
    ll ans = 0;
    loop(i, 1, n) ans = max(ans, dp[i]);
    cout << ans << '\n';
    return 0;
}