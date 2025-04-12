// BOJ - 2847 게임을 만든 동준이

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    int arr[n] = {0, };
    loop(i, 0, n - 1) cin >> arr[i]; 

    int res = 0;
    for(int i = n - 2; i >= 0; i--)
        if(arr[i] >= arr[i + 1]) {
            res += (arr[i] - arr[i + 1] + 1);
            arr[i] = arr[i + 1] - 1;
        }
    cout << res << '\n';
}