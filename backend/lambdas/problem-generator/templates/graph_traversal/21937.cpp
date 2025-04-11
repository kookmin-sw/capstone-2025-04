// BOJ - 21937 작업

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 100001
 
using namespace std;
 
vector<ll> arr[MAXN];
ll visited[MAXN];
void chk(ll k) {
    if(visited[k]) return;
    visited[k] = 1;
    if(arr[k].size() == 0) return;
    for(ll v : arr[k]) chk(v);
    return;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, m; cin >> n >> m;
    loop(i, 1, m) {
        ll f, t; cin >> f >> t;
        arr[t].push_back(f);
    }

    ll k; cin >> k;
    chk(k);

    ll cnt = 0;
    LOOP(i, 1, MAXN) if(visited[i]) cnt++;
    cout << (cnt - 1) << '\n';
}