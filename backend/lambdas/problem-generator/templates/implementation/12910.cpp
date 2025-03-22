// BOJ - 12910 사탕 나눠주기

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
map<ll, ll> candy;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n; cin >> n;
    loop(i, 1, n) {
        ll k; cin >> k;
        candy[k] += 1;
    }

    ll res = 0, mv = 1;
    loop(i, 1, n) {
        if(candy[i] == 0) break;
        res += mv * candy[i];
        mv *= candy[i];
    }

    cout << res << '\n';
}