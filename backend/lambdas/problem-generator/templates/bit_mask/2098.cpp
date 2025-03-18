// BOJ - 2098 외판원 순회

#include <iostream>
#define ll long long
#define MAXN 16
#define INF 0x7FFFFFFF

using namespace std;


int n;

ll G[MAXN][MAXN] = {0, };
ll d[MAXN][1 << (MAXN)] = {0, };

ll min(ll a, ll b)
{
    return a < b ? a : b;
}

ll TSP(int cur, int visited)
{
    if(visited == (1 << n) - 1)
        return !G[cur][0] ? INF : G[cur][0];

    if(d[cur][visited]) return d[cur][visited];

    ll v = 0x7FFFFFFF;
    for(int i = 1; i < n; i++)
        if(!(visited & (1 << i)) && G[cur][i])
            v = min(v, TSP(i, (visited | (1 << i))) + G[cur][i]);

    d[cur][visited] = v;

    return d[cur][visited];
}

int main()
{
    cin.tie(0); ios::sync_with_stdio(false);

    cin >> n;
    for(int i = 0; i < n; i++)
        for(int j = 0; j < n; j++)
            cin >> G[i][j];

    cout << TSP(0, 1);
}
