// BOJ - 11724 연결 요소의 개수

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 1000 + 1
 
using namespace std;
vector<int> arr[MAXN]; int visited[MAXN];

void dfs(int v) {
    visited[v] = 1;
    for(int nv : arr[v]) if(!visited[nv]) dfs(nv);
}

int main() {
    int n, m; cin >> n >> m;
    while(m--) {
        int s, t; cin >> s >> t;
        arr[s].push_back(t); arr[t].push_back(s);
    }

    int ans = 0;
    loop(i, 1, n) {
        if(!visited[i])
            dfs(i), ans++;
    }

    cout << ans << '\n';
}