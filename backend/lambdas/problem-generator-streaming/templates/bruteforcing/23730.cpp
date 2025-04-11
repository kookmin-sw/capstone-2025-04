// BOJ - 23730 Guessing Answers

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define MAXN 100002
 
using namespace std;
int n, m, arr[MAXN] = {0, }, myans[MAXN] = {0, };
int dfs(int k) {
    if(k == n + 1) return 1;
    if(myans[k]) return dfs(k + 1);
    loop(sel, 1, 5) {
        if((k == 1 || myans[k - 1] != sel) && sel != arr[k]) {
            if(myans[k + 1] && sel == myans[k + 1]) continue;
            myans[k] = sel;
            if(dfs(k + 1)) return 1;
            myans[k] = 0;
        }
    }
    return 0;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n >> m;
    loop(i, 1, n) cin >> arr[i];
    loop(i, 1, m) { int k; cin >> k; myans[k] = arr[k]; } // 이미 정답임.
    dfs(1);
    loop(i, 1, n) cout << myans[i] << ' ';
    cout << '\n';
}