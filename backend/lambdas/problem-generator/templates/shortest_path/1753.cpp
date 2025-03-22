// BOJ - 1753 최단경로

#include <iostream>
#include <queue>
#include <vector>
#define INF 0x7FFFFFFF
#define MAXV 20000 + 1

using namespace std;

struct edge {
    int v, cost;
    bool operator<(const edge& e) const
    {
        return cost < e.cost;
    }
    bool operator>(const edge& e) const
    {
        return cost > e.cost;
    }
};

vector<edge> graph[MAXV];
int dist[MAXV];
int n, m, s;

int min(int a, int b)
{
    return a < b ? a : b;
}

void dijkstra()
{
    priority_queue<edge, vector<edge>, greater<edge> > pq;
    dist[s] = 0;
    pq.push({s, 0});
    while(!pq.empty())
    {
        int v = pq.top().v;
        int cost = pq.top().cost; pq.pop();
        for(int i = 0; i < graph[v].size(); i++)
        {
            int nei = graph[v][i].v;
            int neicost = graph[v][i].cost + cost;
            if(dist[nei] > neicost)
            {
                dist[nei] = neicost;
                pq.push({nei, neicost});
            }
        }
    }
}

int main()
{
    cin.tie(0); ios::sync_with_stdio(false);

    for(int i = 0; i < MAXV; i++) dist[i] = INF;

    cin >> n >> m >> s;

    for(int i = 0; i < m; i++)
    {
        int _1, _2, _3; cin >> _1 >> _2 >> _3;
        graph[_1].push_back({_2, _3});
    }

    dijkstra();

    for(int i = 1; i <= n; i++)
    {
        if(dist[i] == INF) cout << "INF\n";
        else cout << dist[i] << '\n';
    }
}