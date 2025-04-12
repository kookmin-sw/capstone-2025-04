// BOJ - 21032 Odd GCD Matching

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 20001
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n; cin >> n;
    ll odd = 0, even = 0;
    loop(i, 1, n) {
        ll k; cin >> k;
        if(k % 2) odd++;
        else even++;
    }

    ll ans = min(odd, even);
    odd -= ans;
    ans += (odd / 2);
    cout << ans << '\n';
}