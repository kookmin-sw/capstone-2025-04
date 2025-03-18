// BOJ - 17952

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    vector<pair<int, int> > v; v.push_back({0, 0});
    loop(i, 1, n) {
        int m; cin >> m;
        if(!m) { v.push_back({0, 0}); continue; }
        int a, t; cin >> a >> t;
        v.push_back({a, t});
    }

    int score = 0; stack<pair<int, int> > stk;
    loop(i, 1, n) {
        if(v[i].first) { // add homework
            if(v[i].second == 1) score += v[i].first;
            else stk.push({v[i].first, v[i].second - 1});
        }
        else {
            if(stk.empty()) continue;
            pair<int, int> t = stk.top(); stk.pop();
            if(t.second == 1) score += t.first;
            else stk.push({t.first, t.second - 1});
        }
    } 
    cout << score << '\n';
}