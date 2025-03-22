// BOJ - 1238 피티

// multiple vertexes to one vertex could be exchangeable for the opposite way.
#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 1001
#define MAXM 10001
#define INF 0x7fffffff
 
using namespace std;

struct p {
    ll to, val;
    bool operator<(const p& o) const {
        return val > o.val;
    }
    bool operator>(const p& o) const {
        return val < o.val;
    }
};
vector<p> gph[MAXN], gph2[MAXN];
ll dist[MAXN], dist2[MAXN];
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    LOOP(i, 0, MAXN) dist[i] = INF, dist2[i] = INF;
 
    ll n, m, x; cin >> n >> m >> x;
    loop(i, 1, m) {
        ll to, from, val; cin >> to >> from >> val;
        gph[from].push_back({to, val});
        gph2[to].push_back({from, val});
    }

    priority_queue<p> pq; pq.push({x, 0});
    while(!pq.empty()) {
        p t = pq.top(); pq.pop();
        for(p nv : gph[t.to]) {
            if(nv.val + t.val < dist[nv.to]) {
                dist[nv.to] = nv.val + t.val;
                pq.push({nv.to, dist[nv.to]});
            }
        }
    }

    priority_queue<p> pq2; pq2.push({x, 0});
    while(!pq2.empty()) {
        p t = pq2.top(); pq2.pop();
        for(p nv : gph2[t.to]) {
            if(nv.val + t.val < dist2[nv.to]) {
                dist2[nv.to] = nv.val + t.val;
                pq2.push({nv.to, dist2[nv.to]});
            }
        }
    }

    ll ans = 0;
    loop(i, 1, n) if(i != x) ans = max(ans, dist[i] + dist2[i]);

    cout << ans << '\n';
}