#include <iostream>
#include <vector>
#include <algorithm>
#include <queue>

using namespace std;

vector<int> arr[101];
int visited[101];
int dfs(int k) {
    visited[k] = 1;
    int ans = 1;
    for(int p : arr[k]) 
        if(!visited[p])
            ans += dfs(p);
    return ans;
}
int main() {
    int n, k; cin >> n >> k;

    while(k--) {
        int f, t; cin >> f >> t;
        arr[f].push_back(t);
        arr[t].push_back(f);
    }

    cout << dfs(1) - 1 << '\n';
}