// BOJ - 1967 트리의 지름

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 10000 + 1
 
using namespace std;
struct p {
    int to, dist;
};
int n, visited[MAXN], maxv = -1, maxc = -0x7FFFFFFF;
vector<p> arr[MAXN];

void dfs(int v, int dist) {
    visited[v] = 1;
    if(maxc < dist) {
        maxc = dist;
        maxv = v;
    }
    for(p pi : arr[v]) {
        int nv = pi.to, nv_dist = pi.dist;
        if(!visited[nv])
            dfs(nv, dist + nv_dist);
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);

    cin >> n;
    LOOP(i, 1, n) {
        int f, t, cost; cin >> f >> t >> cost;
        arr[f].push_back({t, cost});
        arr[t].push_back({f, cost});
    }

    if(n == 1) dfs(1, 0);
    else dfs(2, 0);
    memset(visited, 0, sizeof(visited));
    dfs(maxv, 0);
    cout << maxc << '\n';
}