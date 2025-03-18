// BOJ - 16567 바이너리 왕국

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 1000001
 
using namespace std;
 
ll arr[MAXN] = {0, }, v = 0;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, m; cin >> n >> m;
    loop(i, 1, n) {
        cin >> arr[i];
        if(arr[i] && !arr[i - 1]) v += 1;
    }
    loop(i, 1, m) {
        ll c; cin >> c;
        if(c == 0) cout << v << '\n';
        else {
            ll k; cin >> k; if(arr[k]) continue;
            arr[k] = 1;
            if(!arr[k - 1] && !arr[k + 1]) v += 1;
            else if(arr[k - 1] && arr[k + 1]) v -= 1;
        }
    }
}