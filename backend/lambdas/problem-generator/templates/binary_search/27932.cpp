// BOJ - 27932 어깨동무

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, k; cin >> n >> k;
    vector<ll> v(n + 1);
    loop(i, 1, n) cin >> v[i];

    ll l = 0, h = 1e9, ans;
    while(l <= h) {
        ll m = (l + h) / 2;
        ll cnt = 0;
        loop(i, 1, n) {
            if(i > 1 && abs(v[i - 1] - v[i]) > m) cnt++;
            else if(i < n && abs(v[i + 1] - v[i]) > m) cnt++;
        }
        if(cnt <= k) {
            ans = m;
            h = m - 1;
        }
        else l = m + 1;
    }

    cout << ans << '\n';
}