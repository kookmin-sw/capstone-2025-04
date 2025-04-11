// BOJ - 20117 호반우 상인의 이상한 품질 계산법

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 100001
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    vector<ll> v;
    ll n; cin >> n;
    loop(i, 1, n) {
        ll k; cin >> k;
        v.push_back(k);
    }
    sort(v.begin(), v.end());

    ll ans = 0;
    LOOP(i, v.size() / 2, v.size()) ans += (v[i] * 2);
    cout << ans - (v.size() % 2 ? v[v.size() / 2] : 0) << '\n';

}