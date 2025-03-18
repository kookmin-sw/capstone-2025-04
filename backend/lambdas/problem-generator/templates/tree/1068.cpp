// BOJ - 1068 트리

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

int n, k;
vector<int> arr[50];
int leaf() {
    // delete
    queue<int> q; q.push(k);
    while(!q.empty()) {
        int t = q.front(); q.pop();
        for(int v : arr[t]) {
            q.push(v);
        }
        arr[t] = vector<int>(1, -1);
    }

    // find leaf
    int leafs = 0;
    loop(i, 0, n - 1) if(arr[i].size() == 0) leafs++; else {
        if(arr[i].size() != 1) continue;
        if(arr[i][0] == k) leafs++;
    }
    return leafs;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n;
    loop(i, 0, n - 1) {
        int p; cin >> p;
        if(p != -1) arr[p].push_back(i);
    }
    cin >> k;

    cout << leaf() << '\n';
}