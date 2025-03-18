// BOJ - 1991 트리 순회

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
struct p {
    int l, r;
}; p arr[27];
void order(int v, string mode) {
    if(v == -1) return;
    if(mode == "pre") cout << (char) ('A' + v);
    order(arr[v].l, mode);
    if(mode == "in") cout << (char) ('A' + v);
    order(arr[v].r, mode);
    if(mode == "post") cout << (char) ('A' + v);
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    loop(i, 1, n) {
        string v, l, r; cin >> v >> l >> r;
        arr[v[0] - 'A'] = {l[0] == '.' ? -1 : l[0] - 'A', r[0] == '.' ? -1 : r[0] - 'A'};
    }

    order(0, "pre");
    cout << '\n';
    order(0, "in");
    cout << '\n';
    order(0, "post");
}