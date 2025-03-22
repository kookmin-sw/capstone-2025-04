// BOJ - 11501 주식

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 1000001
#define ll long long int
 
using namespace std;

ll arr[MAXN], maxv[MAXN];
void run() {
    memset(arr, 0, sizeof(arr));
    memset(maxv, 0, sizeof(maxv));

    ll n; cin >> n;
    loop(i, 0, n - 1) cin >> arr[i];
    for(ll i = n - 1; i >= 1; i--) {
        if(i == n - 1) maxv[i - 1] = arr[i];
        else maxv[i - 1] = max(arr[i], maxv[i]);
    }

    ll res = 0;
    loop(i, 0, n - 2)
        if(arr[i] < maxv[i])
            res += (maxv[i] - arr[i]);
    cout << res << '\n';
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int t; cin >> t;
    while(t--) run();
    return 0;
}