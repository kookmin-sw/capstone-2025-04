// BOJ - 26163 문제 출제

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    vector<ll> v;
    loop(i, 1, 5) {
        ll k; cin >> k;
        v.push_back(k);
    }

    ll ans = 0;
    loop(a, 0, 15) loop(b, 0, 8) loop(c, 0, 5) loop(d, 0, 4) loop(e, 0, 3) {
        if((a + b + c + d + e <= 3 && a + 2 * b + 3 * c + 4 * d + 5 * e <= 10)
            || (a + b + c + d + e >= 4 && a + 2 * b + 3 * c + 4 * d + 5 * e <= 15)) {
            ans = max(ans, v[0] * a + v[1] * b + v[2] * c + v[3] * d + v[4] * e);
        }
    }

    cout << ans << '\n';
}