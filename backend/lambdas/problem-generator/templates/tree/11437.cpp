// BOJ - 11437 LCA

// 이 문제에서는 O(depth)의 LCA를 구현하고 있습니다.
// 14267 번에서 O(lg(depth))의 LCA를 구현하고 있습니다.
// https://4legs-study.tistory.com/121 글 참조

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 50001
 
using namespace std;
int n, m, parent[MAXN] = {0, }, depth[MAXN] = {0, };
vector<int> arr[MAXN];
int lca(int a, int b) {
    if(depth[a] < depth[b]) return lca(b, a);
    while(depth[a] != depth[b]) a = parent[a]; // 깊이가 같아질때까지
    while(a != b) a = parent[a], b = parent[b];
    return a;
}
void set_tree(int v, int pv) {
    parent[v] = pv; depth[v] = depth[pv] + 1; // default root node depth = 1
    for(int nv : arr[v]) {
        if(pv == nv) continue;
        set_tree(nv, v);
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n;
    loop(i, 1, n - 1) {
        int s, t; cin >> s >> t;
        arr[s].push_back(t);
        arr[t].push_back(s);
    }

    set_tree(1, 0);
    cin >> m;
    loop(i, 1, m) {
        int s, t; cin >> s >> t;
        cout << lca(s, t) << '\n';
    }
}