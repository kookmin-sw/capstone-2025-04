// BOJ - 18110 solved.ac

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, sum = 0, cnt = 0; cin >> n;
    ll cut = (n * 15 + 50) / 100;
    vector<ll> v; v.push_back(0);

    loop(i, 1, n) {
        ll k; cin >> k;
        v.push_back(k);
    }
    sort(v.begin(), v.end());
    loop(i, 1, n) {
        if(cut < i && i <= n - cut) sum += v[i], cnt++;
    }   
    if(cnt != 0) cout << (sum + cnt / 2) / cnt << '\n';
    else cout << 0 << '\n';
}