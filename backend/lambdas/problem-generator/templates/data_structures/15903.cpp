// BOJ - 15903 카드 합체 놀이

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    ll n, m; cin >> n >> m;
    priority_queue<ll, vector<ll>, greater<ll> > pq;
    loop(i, 1, n) {
        ll k; cin >> k; pq.push(k);
    }
    while(m--) {
        ll k = pq.top(); pq.pop();
        k += pq.top(); pq.pop();
        pq.push(k); pq.push(k);
    }
    
    ll ans = 0;
    while(!pq.empty()) {
        ans += pq.top(); pq.pop();
    }
    cout << ans << '\n';
}