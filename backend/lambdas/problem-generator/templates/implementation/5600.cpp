// BOJ - 5600 품질검사

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
struct p {
    int x, y, z;
};
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int a, b, c; cin >> a >> b >> c;
    int n; int works[a + b + c + 1] = {0, };
    loop(_, 1, a + b + c) works[_] = 2;
    cin >> n; vector<p> notworking;
    loop(_, 1, n) {
        int i, j, k, w; cin >> i >> j >> k >> w;
        if(w == 1) works[i] = works[j] = works[k] = 1;
        else notworking.push_back({i, j, k});
    }
    for(p t : notworking) {
        int cnt = 0, failed_any = 0;
        if(works[t.x] == 1) cnt++; else failed_any = t.x;
        if(works[t.y] == 1) cnt++; else failed_any = t.y;
        if(works[t.z] == 1) cnt++; else failed_any = t.z;
        if(cnt == 2) works[failed_any] = 0;
    }
    loop(i, 1, a + b + c) cout << works[i] << '\n';
}