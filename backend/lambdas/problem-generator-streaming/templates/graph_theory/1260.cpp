// BOJ - 1260 DFS와 BFS

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

vector<int> arr[1001];

int visited[1001] = {0, };

void dfs(int v) {
    visited[v] = 1;
    cout << v << ' ';
    for(int nv : arr[v]) {
        if(!visited[nv]) dfs(nv);
    }
}

void bfs(int v) {
    queue<int> q; q.push(v); visited[v] = 1;
    while(!q.empty()) {
        int t = q.front(); q.pop();
        cout << t << ' ';
        for(int nv : arr[t]) {
            if(!visited[nv]) visited[nv] = 1, q.push(nv);
        }
    }
}
int main() {
    //ios::sync_with_stdio(false); cin.tie(0);

    int n, m, v;
    cin >> n >> m >> v;
    loop(i, 1, m) {
        int s, t; cin >> s >> t;
        arr[s].push_back(t);
        arr[t].push_back(s);
    }

    loop(i, 1, n) sort(arr[i].begin(), arr[i].end());

    dfs(v); memset(visited, 0, sizeof(visited)); cout << '\n';
    bfs(v); cout << '\n';
}