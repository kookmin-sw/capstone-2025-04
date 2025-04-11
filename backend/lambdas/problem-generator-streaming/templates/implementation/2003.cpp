// BOJ - 2003 수들의 합 2 (투 포인터)

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define MAXN 10001
 
using namespace std;
 
ll arr[MAXN];
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, m; cin >> n >> m;
    loop(i, 1, n) cin >> arr[i];
    
    ll j = 1, s = arr[1], ans = 0; // [i, j] 합
    loop(i, 1, n) {
        while(j <= n && s < m) s += arr[++j];
        if(s == m) { ans++; if(j <= n) s += arr[++j]; }
        if(j >= n + 1) break;
        s -= arr[i];
    }

    cout << ans << '\n';
}