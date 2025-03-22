// BOJ - 17219 비밀번호 찾기 ( EC#3 - Problem 14 )

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n, m; cin >> n >> m;
    map<string, string> mm;
    loop(i, 1, n) {
        string k, v; cin >> k >> v;
        mm[k] = v;
    }
    loop(i, 1, m) {
        string k; cin >> k;
        cout << mm[k] << '\n';
    }
}