// BOJ - 23322 초콜릿 뺏어 먹기

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, k; cin >> n >> k;
    vector<ll> v;
    loop(i, 1, n) {
        ll t; cin >> t;
        v.push_back(t);
    }
    sort(v.begin(), v.end());

    ll days = 0, ans = 0;
    while(1) {
        ll xv = 0, xi = -1;
        loop(i, k, n - 1) {
            if(v[i - k] == v[i]) continue;
            else if(v[i - k] < v[i]) {
                xv = v[i] - v[i - k];
                xi = i; break;
            }
        }
        if(xi == -1) break;
        days++; ans += xv; v[xi] = v[xi - k];
        sort(v.begin(), v.end());
    }

    cout << ans << ' ' << days << '\n';
}