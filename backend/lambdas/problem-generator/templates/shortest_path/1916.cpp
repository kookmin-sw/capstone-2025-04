// BOJ - 1916 최소비용 구하기

// City A -> City B, Cost > 0, Dijkstra

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
#define MAXN 1001
#define INF 0x7fffffffffff
 
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

vector<p> gph[MAXN]; ll dist[MAXN];
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    LOOP(i, 0, MAXN) dist[i] = INF;
 
    ll n, m; cin >> n >> m;
    loop(i, 1, m) {
        ll s, e, v; cin >> s >> e >> v;
        gph[s].push_back({e, v});
    }

    ll a, b; cin >> a >> b;

    priority_queue<p> pq; pq.push({a, 0}); dist[a] = 0;
    while(!pq.empty()) {
        p cur = pq.top(); pq.pop();
        if(cur.val > dist[cur.to]) continue; // TLE Prevention
        for(p np : gph[cur.to]) {
            if(cur.val + np.val < dist[np.to]) {
                dist[np.to] = cur.val + np.val;
                pq.push({np.to, dist[np.to]});
            }
        }
    }

    cout << dist[b] << '\n';
}