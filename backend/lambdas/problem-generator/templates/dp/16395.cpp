// BOJ - 16395 파스칼의 삼격형

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n, k; cin >> n >> k;
    int dp[n + 1][n + 1] = {0, };
    loop(i, 1, n) loop(j, 1, i) {
        if(j == 1 || j == i) dp[i][j] = 1;
        else dp[i][j] = dp[i - 1][j - 1] + dp[i - 1][j];
    }

    cout << dp[n][k] << '\n';
}