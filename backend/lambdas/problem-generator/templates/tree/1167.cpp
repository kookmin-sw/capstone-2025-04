// BOJ - 1167 트리의 지름

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 100000 + 1
 
using namespace std;

struct p {
    int to, dist;
};
int n, visited[MAXN], mostfar, mostfardist;
vector<p> arr[MAXN];

void _dfs(int v, int dist);
void dfs(int v, int dist) {
    mostfar = -1, mostfardist = -0x7FFFFFFF;
    memset(visited, 0, sizeof(visited));
    _dfs(v, dist);
}
void _dfs(int v, int dist) {
    visited[v] = 1;
    if(mostfardist < dist) {
        mostfardist = dist;
        mostfar = v;
    }
    for(p _p : arr[v]) {
        int nv = _p.to, nv_dist = _p.dist;
        if(!visited[nv])
            _dfs(nv, dist + nv_dist);
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n;
    loop(i, 1, n) {
        int v, t, dist; cin >> v;
        while(1) {
            cin >> t; if(t == -1) break;
            cin >> dist; arr[v].push_back({t, dist});
        }
    }

    dfs(1, 0); int _mf = mostfar;
    dfs(mostfar, 0);
    cout << mostfardist << '\n';
}