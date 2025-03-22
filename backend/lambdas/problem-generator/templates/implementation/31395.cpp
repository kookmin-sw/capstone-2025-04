// BOJ - 31395 정렬된 연속한 부분수열의 개수

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n; cin >> n;
    vector<ll> v(n + 1, 0);
    loop(i, 1, n) cin >> v[i];
    ll ans = 0, t = 0, cmp = 0;
    loop(i, 1, n) {
        ll k = v[i];
        if(cmp < k) t++;
        else t = 1;
        cmp = k;
        ans += t;
    }

    cout << ans << '\n';
}