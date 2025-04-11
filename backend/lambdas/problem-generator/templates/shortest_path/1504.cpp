// BOJ - 1504 특정한 최단 경로

#include <iostream>
#include <queue>
#define MAXV 800 + 1
#define INF 987654321
#define ll long long 

using namespace std;

int v, e; int v1, v2;

struct edge
{
    ll v;
    ll cost;
    bool operator<(const edge& e)const{
		return cost < e.cost;
	}
	bool operator>(const edge& e)const{
		return cost > e.cost;
	}
};

vector<edge> G[MAXV];

ll min(ll a, ll b)
{
    return a < b ? a : b;
}

vector<ll> dijkstra(int start)
{
    vector<ll> dist(MAXV, INF);
    priority_queue<edge> pq;
    dist[start] = 0;
    pq.push({start, 0});

    while(!pq.empty())
    {
        edge t = pq.top(); pq.pop();
        for(int i = 0; i < G[t.v].size(); i++)
        {
            int nei = G[t.v][i].v;
            ll cost = G[t.v][i].cost + t.cost;
            if(dist[nei] > cost)
            {
                dist[nei] = cost;
                pq.push({nei, cost});
            }
        }
    }

    return dist;
}

int main()
{
    cin >> v >> e;

    for(int i = 1; i <= e; i++)
    {
        int from, to, val;
        cin >> from >> to >> val;
        G[from].push_back({to, val});
        G[to].push_back({from, val});
    }

    cin >> v1 >> v2;

    vector<ll> d1r = dijkstra(1);
    vector<ll> d2r = dijkstra(v1);
    vector<ll> d3r = dijkstra(v2);

    ll path1 = d1r[v1] + d2r[v2] + d3r[v];
    ll path2 = d1r[v2] + d3r[v1] + d2r[v];

    ll ans = min(path1, path2);
    if(0 <= ans && ans < INF)
        cout << ans;
    else
        cout << -1;
}