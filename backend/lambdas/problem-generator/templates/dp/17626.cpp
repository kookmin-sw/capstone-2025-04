// BOJ - 17626 Four Squares

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 50001
#define INF 0x7fffffff
 
using namespace std;
 
ll dp[MAXN] = {0, 1, 2, 3, 1};
int main() {
    for(int i = 5; i < MAXN; i++) dp[i] = INF;
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n; cin >> n;
    loop(i, 5, n)
        for(int j = 1; i - j * j >= 0; j++)
            dp[i] = min(dp[i - j * j] + 1, dp[i]); 

    cout << dp[n] << '\n';
}